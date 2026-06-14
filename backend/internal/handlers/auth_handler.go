package handlers

import (
	"encoding/json"
	"io"
	"net/http"

	"github.com/gin-gonic/gin"
	svix "github.com/svix/svix-webhooks/go"

	"github.com/kirantiwari/fingcheck/internal/services"
	"github.com/kirantiwari/fingcheck/pkg/response"
)

// AuthHandler handles Clerk webhook events for user lifecycle management.
type AuthHandler struct {
	userService   services.UserService
	webhookSecret string
}

// NewAuthHandler creates a new AuthHandler with the given user service and webhook secret.
func NewAuthHandler(userService services.UserService, webhookSecret string) *AuthHandler {
	return &AuthHandler{
		userService:   userService,
		webhookSecret: webhookSecret,
	}
}

// clerkWebhookPayload represents the top-level structure of a Clerk webhook event.
type clerkWebhookPayload struct {
	Type string          `json:"type"`
	Data json.RawMessage `json:"data"`
}

// clerkEmailAddress represents an email address entry in the Clerk user data.
type clerkEmailAddress struct {
	EmailAddress string `json:"email_address"`
}

// clerkUserData represents the user data sent in Clerk webhook events.
type clerkUserData struct {
	ID             string              `json:"id"`
	EmailAddresses []clerkEmailAddress `json:"email_addresses"`
	FirstName      string              `json:"first_name"`
	LastName       string              `json:"last_name"`
	ImageURL       string              `json:"image_url"`
}

// HandleClerkWebhook processes incoming Clerk webhook events.
func (h *AuthHandler) HandleClerkWebhook(c *gin.Context) {
	body, err := io.ReadAll(c.Request.Body)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Failed to read request body", err.Error())
		return
	}

	// Extract Svix headers for webhook verification
	headers := http.Header{}
	headers.Set("svix-id", c.GetHeader("svix-id"))
	headers.Set("svix-timestamp", c.GetHeader("svix-timestamp"))
	headers.Set("svix-signature", c.GetHeader("svix-signature"))

	// Verify the webhook signature
	wh, err := svix.NewWebhook(h.webhookSecret)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to initialize webhook verifier", err.Error())
		return
	}

	err = wh.Verify(body, headers)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid webhook signature", err.Error())
		return
	}

	// Parse the event payload
	var payload clerkWebhookPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		response.Error(c, http.StatusBadRequest, "Failed to parse webhook payload", err.Error())
		return
	}

	switch payload.Type {
	case "user.created":
		h.handleUserCreated(c, payload.Data)
	case "user.updated":
		h.handleUserUpdated(c, payload.Data)
	case "user.deleted":
		h.handleUserDeleted(c, payload.Data)
	default:
		// Acknowledge unknown events gracefully
		response.Success(c, http.StatusOK, "Event type not handled", nil)
	}
}

func (h *AuthHandler) handleUserCreated(c *gin.Context, data json.RawMessage) {
	var userData clerkUserData
	if err := json.Unmarshal(data, &userData); err != nil {
		response.Error(c, http.StatusBadRequest, "Failed to parse user data", err.Error())
		return
	}

	email := ""
	if len(userData.EmailAddresses) > 0 {
		email = userData.EmailAddresses[0].EmailAddress
	}

	_, err := h.userService.CreateUser(
		c.Request.Context(),
		userData.ID,
		email,
		userData.FirstName,
		userData.LastName,
		userData.ImageURL,
	)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to create user", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "User created successfully", nil)
}

func (h *AuthHandler) handleUserUpdated(c *gin.Context, data json.RawMessage) {
	var userData clerkUserData
	if err := json.Unmarshal(data, &userData); err != nil {
		response.Error(c, http.StatusBadRequest, "Failed to parse user data", err.Error())
		return
	}

	// Look up the user by Clerk ID first
	existingUser, err := h.userService.GetUserByClerkID(c.Request.Context(), userData.ID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "User not found", err.Error())
		return
	}

	email := ""
	if len(userData.EmailAddresses) > 0 {
		email = userData.EmailAddresses[0].EmailAddress
	}

	updates := map[string]interface{}{
		"first_name": userData.FirstName,
		"last_name":  userData.LastName,
		"avatar_url": userData.ImageURL,
	}
	if email != "" {
		updates["email"] = email
	}

	_, err = h.userService.UpdateUser(c.Request.Context(), existingUser.ID, updates)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to update user", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "User updated successfully", nil)
}

func (h *AuthHandler) handleUserDeleted(c *gin.Context, data json.RawMessage) {
	var userData clerkUserData
	if err := json.Unmarshal(data, &userData); err != nil {
		response.Error(c, http.StatusBadRequest, "Failed to parse user data", err.Error())
		return
	}

	existingUser, err := h.userService.GetUserByClerkID(c.Request.Context(), userData.ID)
	if err != nil {
		response.Error(c, http.StatusNotFound, "User not found", err.Error())
		return
	}

	if err := h.userService.DeleteUser(c.Request.Context(), existingUser.ID, existingUser.ID); err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to delete user", err.Error())
		return
	}

	response.Success(c, http.StatusOK, "User deleted successfully", nil)
}

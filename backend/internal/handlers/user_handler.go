package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/internal/services"
	"github.com/kirantiwari/fingcheck/pkg/response"
)

// UserHandler handles HTTP requests for user management endpoints.
type UserHandler struct {
	userService services.UserService
}

// NewUserHandler creates a new UserHandler with the given user service.
func NewUserHandler(userService services.UserService) *UserHandler {
	return &UserHandler{
		userService: userService,
	}
}

// GetProfile returns the currently authenticated user's profile.
func (h *UserHandler) GetProfile(c *gin.Context) {
	user := c.MustGet("user").(models.User)
	response.Success(c, http.StatusOK, "Profile retrieved successfully", user)
}

// GetAllUsers returns a paginated list of all users. Admin only.
func (h *UserHandler) GetAllUsers(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	if page < 1 {
		page = 1
	}
	if pageSize < 1 {
		pageSize = 10
	}

	users, total, err := h.userService.GetAllUsers(c.Request.Context(), page, pageSize)
	if err != nil {
		response.InternalError(c, "Failed to retrieve users")
		return
	}

	response.Success(c, http.StatusOK, "Users retrieved successfully", gin.H{
		"users":     users,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetUserByID returns a user by their ID. Admin only.
func (h *UserHandler) GetUserByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid user ID format", err.Error())
		return
	}

	user, err := h.userService.GetUserByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "User not found")
		return
	}

	response.Success(c, http.StatusOK, "User retrieved successfully", user)
}

// UpdateUser updates a user's details. Admin only.
func (h *UserHandler) UpdateUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid user ID format", err.Error())
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	user, err := h.userService.UpdateUser(c.Request.Context(), id, updates)
	if err != nil {
		response.InternalError(c, "Failed to update user")
		return
	}

	response.Success(c, http.StatusOK, "User updated successfully", user)
}

// DeleteUser soft-deletes a user. Admin only.
func (h *UserHandler) DeleteUser(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid user ID format", err.Error())
		return
	}

	adminID := c.MustGet("userID").(primitive.ObjectID)

	if err := h.userService.DeleteUser(c.Request.Context(), id, adminID); err != nil {
		response.InternalError(c, "Failed to delete user")
		return
	}

	response.Success(c, http.StatusOK, "User deleted successfully", nil)
}

type updateRoleRequest struct {
	Role string `json:"role" binding:"required"`
}

// UpdateRole changes a user's role. Admin only.
func (h *UserHandler) UpdateRole(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid user ID format", err.Error())
		return
	}

	var req updateRoleRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	role := models.UserRole(req.Role)
	if role != models.RoleAdmin && role != models.RoleUser {
		response.Error(c, http.StatusBadRequest, "Invalid role. Must be 'admin' or 'user'", nil)
		return
	}

	adminID := c.MustGet("userID").(primitive.ObjectID)

	user, err := h.userService.UpdateRole(c.Request.Context(), id, role, adminID)
	if err != nil {
		response.InternalError(c, "Failed to update user role")
		return
	}

	response.Success(c, http.StatusOK, "User role updated successfully", user)
}

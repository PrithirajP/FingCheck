package handlers

import (
	"io"
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/internal/services"
	"github.com/kirantiwari/fingcheck/pkg/biometric" 
	"github.com/kirantiwari/fingcheck/pkg/response"
)

// MatchHandler handles HTTP requests for fingerprint matching endpoints.
type MatchHandler struct {
	matchService services.MatchService
}

// NewMatchHandler creates a new MatchHandler with the given match service.
func NewMatchHandler(matchService services.MatchService) *MatchHandler {
	return &MatchHandler{
		matchService: matchService,
	}
}

type matchRequest struct {
	OverlapFingerprintID string `json:"overlap_fingerprint_id" binding:"required"`
}

// MatchFingerprint initiates matching against all registered fingerprints.
func (h *MatchHandler) MatchFingerprint(c *gin.Context) {
	var req matchRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	overlapID, err := primitive.ObjectIDFromHex(req.OverlapFingerprintID)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid overlap fingerprint ID format", err.Error())
		return
	}

	userID := c.MustGet("userID").(primitive.ObjectID)

	results, err := h.matchService.MatchFingerprint(c.Request.Context(), overlapID, userID)
	if err != nil {
		response.Error(c, http.StatusInternalServerError, "Failed to perform fingerprint matching", err.Error())
		return
	}

	user := c.MustGet("user").(models.User)

	if user.Role == models.RoleAdmin {
		response.Success(c, http.StatusOK, "Fingerprint matching completed", gin.H{
			"results":       results,
			"total_results": len(results),
		})
		return
	}

	// For normal user: strip matched fingerprint ID and confidence score. Just return whether match is found or not!
	type userMatchResult struct {
		ComponentIndex int    `json:"component_index"`
		Status         string `json:"status"` // "found" or "not found"
		IsMatch        bool   `json:"is_match"`
	}

	userResults := make([]userMatchResult, len(results))
	for i, res := range results {
		status := "not found"
		if res.IsMatch {
			status = "found"
		}
		userResults[i] = userMatchResult{
			ComponentIndex: res.ComponentIndex,
			Status:         status,
			IsMatch:        res.IsMatch,
		}
	}

	response.Success(c, http.StatusOK, "Fingerprint matching completed", gin.H{
		"results":       userResults,
		"total_results": len(userResults),
	})
}

type userMatchResponse struct {
	ID             primitive.ObjectID `json:"id"`
	ComponentIndex int                `json:"component_index"`
	IsMatch        bool               `json:"is_match"`
	Status         string             `json:"status"` // "found" or "not found"
}

// GetMatchResult returns a match result details. Admin sees full details, User only sees "found" status.
func (h *MatchHandler) GetMatchResult(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid match result ID format", err.Error())
		return
	}

	result, err := h.matchService.GetMatchByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Match result not found")
		return
	}

	user := c.MustGet("user").(models.User)

	if user.Role == models.RoleAdmin {
		response.Success(c, http.StatusOK, "Match result retrieved successfully", result)
		return
	}

	status := "not found"
	if result.IsMatch {
		status = "found"
	}

	userRes := userMatchResponse{
		ID:             result.ID,
		ComponentIndex: result.ComponentIndex,
		IsMatch:        result.IsMatch,
		Status:         status,
	}

	response.Success(c, http.StatusOK, "Match result retrieved successfully", userRes)
}

// GetMyMatches returns matches triggered by current user.
func (h *MatchHandler) GetMyMatches(c *gin.Context) {
	userID := c.MustGet("userID").(primitive.ObjectID)
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	results, total, err := h.matchService.GetMatchesByUser(c.Request.Context(), userID, page, pageSize)
	if err != nil {
		response.InternalError(c, "Failed to retrieve match results")
		return
	}

	user := c.MustGet("user").(models.User)
	if user.Role == models.RoleAdmin {
		response.Success(c, http.StatusOK, "Match results retrieved successfully", gin.H{
			"results":   results,
			"total":     total,
			"page":      page,
			"page_size": pageSize,
		})
		return
	}

	userResults := make([]userMatchResponse, len(results))
	for i, res := range results {
		status := "not found"
		if res.IsMatch {
			status = "found"
		}
		userResults[i] = userMatchResponse{
			ID:             res.ID,
			ComponentIndex: res.ComponentIndex,
			IsMatch:        res.IsMatch,
			Status:         status,
		}
	}

	response.Success(c, http.StatusOK, "Match results retrieved successfully", gin.H{
		"results":   userResults,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetAllMatches lists all match results. Admin only.
func (h *MatchHandler) GetAllMatches(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	results, total, err := h.matchService.GetAllMatches(c.Request.Context(), page, pageSize)
	if err != nil {
		response.InternalError(c, "Failed to retrieve matches list")
		return
	}

	response.Success(c, http.StatusOK, "Matches list retrieved successfully", gin.H{
		"results":   results,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// DirectMatch handles uploading a raw image and searching the DB directly.
func (h *MatchHandler) DirectMatch(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Image file is required", err.Error())
		return
	}

	fileContent, err := file.Open()
	if err != nil {
		response.InternalError(c, "Failed to open image file")
		return
	}
	defer fileContent.Close()

	imageBytes, err := io.ReadAll(fileContent)
	if err != nil {
		response.InternalError(c, "Failed to read image file")
		return
	}

	searcherID := c.MustGet("userID").(primitive.ObjectID)

	results, err := h.matchService.DirectMatch(c.Request.Context(), imageBytes, searcherID)
	if err != nil {
		response.InternalError(c, "Failed to execute direct match")
		return
	}

	response.Success(c, http.StatusOK, "Direct match executed successfully", gin.H{
		"results": results,
	})
}

// CompareTwoFingerprints handles the direct A vs B comparison.
func (h *MatchHandler) CompareTwoFingerprints(c *gin.Context) {
	file1, err1 := c.FormFile("image1")
	file2, err2 := c.FormFile("image2")
	
	if err1 != nil || err2 != nil {
		response.Error(c, http.StatusBadRequest, "Both image1 and image2 are required", nil)
		return
	}

	f1, _ := file1.Open()
	defer f1.Close()
	bytes1, _ := io.ReadAll(f1)

	f2, _ := file2.Open()
	defer f2.Close()
	bytes2, _ := io.ReadAll(f2)

	// Call the biometric package directly for a fast, memory-only comparison
	score, isMatch, err := biometric.CompareTwoPrints(bytes1, bytes2)
	if err != nil {
		response.InternalError(c, "Failed to analyze fingerprints")
		return
	}

	response.Success(c, http.StatusOK, "Comparison complete", gin.H{
		"is_match": isMatch,
		"score":    score,
	})
}


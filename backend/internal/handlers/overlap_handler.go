package handlers

import (
	"context"
	"log"
	"net/http"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/internal/services"
	"github.com/kirantiwari/fingcheck/pkg/response"
)

// OverlapHandler handles HTTP requests for overlap fingerprint management endpoints.
type OverlapHandler struct {
	overlapService services.OverlapService
	uploadDir      string
}

// NewOverlapHandler creates a new OverlapHandler with the given service and upload directory.
func NewOverlapHandler(overlapService services.OverlapService, uploadDir string) *OverlapHandler {
	return &OverlapHandler{
		overlapService: overlapService,
		uploadDir:      uploadDir,
	}
}

// UploadOverlap handles overlap fingerprint image upload, creates a record, and triggers processing.
func (h *OverlapHandler) UploadOverlap(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Image file is required", err.Error())
		return
	}

	// Generate unique filename
	filename := primitive.NewObjectID().Hex() + "_" + file.Filename
	savePath := filepath.Join(h.uploadDir, "overlaps", filename)

	if err := c.SaveUploadedFile(file, savePath); err != nil {
		response.InternalError(c, "Failed to save uploaded file")
		return
	}

	userID := c.MustGet("userID").(primitive.ObjectID)

	overlap := &models.OverlapFingerprint{
		OriginalImageURL: savePath,
		UploadedBy:       userID,
		ProcessingStatus: models.StatusPending,
	}

	created, err := h.overlapService.UploadOverlap(c.Request.Context(), overlap)
	if err != nil {
		response.InternalError(c, "Failed to create overlap fingerprint record")
		return
	}

	// Trigger asynchronous processing in a goroutine
	go func(overlapID primitive.ObjectID) {
		ctx := context.Background()
		if err := h.overlapService.ProcessOverlap(ctx, overlapID); err != nil {
			log.Printf("Error processing overlap fingerprint %s: %v", overlapID.Hex(), err)
		}
	}(created.ID)

	response.Success(c, http.StatusCreated, "Overlap fingerprint uploaded successfully. Processing started.", created)
}

// GetAllOverlaps returns a paginated list of all overlap fingerprints. Admin only.
func (h *OverlapHandler) GetAllOverlaps(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))

	overlaps, total, err := h.overlapService.GetAllOverlaps(c.Request.Context(), page, pageSize)
	if err != nil {
		response.InternalError(c, "Failed to retrieve overlap fingerprints")
		return
	}

	response.Success(c, http.StatusOK, "Overlap fingerprints retrieved successfully", gin.H{
		"overlaps":  overlaps,
		"total":     total,
		"page":      page,
		"page_size": pageSize,
	})
}

// GetOverlapByID returns an overlap fingerprint by its ID.
func (h *OverlapHandler) GetOverlapByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid overlap fingerprint ID format", err.Error())
		return
	}

	overlap, err := h.overlapService.GetOverlapByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Overlap fingerprint not found")
		return
	}

	response.Success(c, http.StatusOK, "Overlap fingerprint retrieved successfully", overlap)
}

// GetMyOverlaps returns all overlap fingerprints uploaded by the current user.
func (h *OverlapHandler) GetMyOverlaps(c *gin.Context) {
	userID := c.MustGet("userID").(primitive.ObjectID)

	overlaps, err := h.overlapService.GetByUploader(c.Request.Context(), userID)
	if err != nil {
		response.InternalError(c, "Failed to retrieve your overlap fingerprints")
		return
	}

	response.Success(c, http.StatusOK, "Your overlap fingerprints retrieved successfully", overlaps)
}

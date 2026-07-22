package handlers

import (
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strconv"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson/primitive"

	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/internal/services"
	"github.com/kirantiwari/fingcheck/pkg/response"
)

type FingerprintHandler struct {
	fpService  services.FingerprintService
	cloudinary services.CloudinaryService
}

// NewFingerprintHandler creates a new FingerprintHandler with the given service and cloudinary service.
func NewFingerprintHandler(fpService services.FingerprintService, cloudinary services.CloudinaryService) *FingerprintHandler {
	return &FingerprintHandler{
		fpService:  fpService,
		cloudinary: cloudinary,
	}
}

// CreateFingerprint handles fingerprint image upload and record creation.
func (h *FingerprintHandler) CreateFingerprint(c *gin.Context) {
	file, err := c.FormFile("image")
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Image file is required", err.Error())
		return
	}

	label := c.PostForm("label")
	fullName := c.PostForm("full_name")
	ageStr := c.PostForm("age")
	gender := c.PostForm("gender")
	proofType := c.PostForm("proof_type")
	proofID := c.PostForm("proof_id")
	contact := c.PostForm("contact")
	address := c.PostForm("address")

	if label == "" || fullName == "" || proofType == "" || proofID == "" {
		response.Error(c, http.StatusBadRequest, "Label, Full Name, Proof Type, and Proof ID are required", nil)
		return
	}

	age, _ := strconv.Atoi(ageStr)
	if age <= 0 {
		age = 25
	}
	if gender == "" {
		gender = "Not Specified"
	}

	fileHandle, err := file.Open()
	if err != nil {
		response.InternalError(c, "Failed to open image file")
		return
	}
	defer fileHandle.Close()

	imageBytes, err := io.ReadAll(fileHandle)
	if err != nil {
		response.InternalError(c, "Failed to read image file")
		return
	}

	// Generate unique filename
	filename := primitive.NewObjectID().Hex() + "_" + file.Filename

	secureURL, err := h.cloudinary.UploadBytes(c.Request.Context(), imageBytes, filename, "fingerprints")
	if err != nil {
		// Fallback to local storage if Cloudinary upload fails
		uploadDir := "./uploads/fingerprints"
		_ = os.MkdirAll(uploadDir, 0755)
		filePath := filepath.Join(uploadDir, filename)
		if writeErr := os.WriteFile(filePath, imageBytes, 0644); writeErr == nil {
			secureURL = "/uploads/fingerprints/" + filename
		} else {
			response.InternalError(c, "Failed to upload file: "+err.Error())
			return
		}
	}

	adminID := c.MustGet("userID").(primitive.ObjectID)

	fp := &models.Fingerprint{
		Label:      label,
		FullName:   fullName,
		Age:        age,
		Gender:     gender,
		ProofType:  proofType,
		ProofID:    proofID,
		Contact:    contact,
		Address:    address,
		ImageURL:   secureURL,
		UploadedBy: adminID,
	}

	created, err := h.fpService.CreateFingerprint(c.Request.Context(), fp, imageBytes, adminID)
	if err != nil {
		response.InternalError(c, "Failed to create fingerprint record: "+err.Error())
		return
	}

	response.Success(c, http.StatusCreated, "Fingerprint created successfully", created)
}

// GetAllFingerprints returns a paginated list of fingerprints with optional status filter.
func (h *FingerprintHandler) GetAllFingerprints(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	pageSize, _ := strconv.Atoi(c.DefaultQuery("page_size", "10"))
	status := c.DefaultQuery("status", "")

	fingerprints, total, err := h.fpService.GetAllFingerprints(c.Request.Context(), page, pageSize, status)
	if err != nil {
		response.InternalError(c, "Failed to retrieve fingerprints")
		return
	}

	response.Success(c, http.StatusOK, "Fingerprints retrieved successfully", gin.H{
		"fingerprints": fingerprints,
		"total":        total,
		"page":         page,
		"page_size":    pageSize,
	})
}

// GetFingerprintByID returns a fingerprint by its ID.
func (h *FingerprintHandler) GetFingerprintByID(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid fingerprint ID format", err.Error())
		return
	}

	fp, err := h.fpService.GetFingerprintByID(c.Request.Context(), id)
	if err != nil {
		response.NotFound(c, "Fingerprint not found")
		return
	}

	response.Success(c, http.StatusOK, "Fingerprint retrieved successfully", fp)
}

// UpdateFingerprint updates a fingerprint's details.
func (h *FingerprintHandler) UpdateFingerprint(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid fingerprint ID format", err.Error())
		return
	}

	var updates map[string]interface{}
	if err := c.ShouldBindJSON(&updates); err != nil {
		response.ValidationError(c, err.Error())
		return
	}

	adminID := c.MustGet("userID").(primitive.ObjectID)

	fp, err := h.fpService.UpdateFingerprint(c.Request.Context(), id, updates, adminID)
	if err != nil {
		response.InternalError(c, "Failed to update fingerprint")
		return
	}

	response.Success(c, http.StatusOK, "Fingerprint updated successfully", fp)
}

// DeleteFingerprint deletes a fingerprint by its ID.
func (h *FingerprintHandler) DeleteFingerprint(c *gin.Context) {
	idStr := c.Param("id")
	id, err := primitive.ObjectIDFromHex(idStr)
	if err != nil {
		response.Error(c, http.StatusBadRequest, "Invalid fingerprint ID format", err.Error())
		return
	}

	adminID := c.MustGet("userID").(primitive.ObjectID)

	if err := h.fpService.DeleteFingerprint(c.Request.Context(), id, adminID); err != nil {
		response.InternalError(c, "Failed to delete fingerprint")
		return
	}

	response.Success(c, http.StatusOK, "Fingerprint deleted successfully", nil)
}


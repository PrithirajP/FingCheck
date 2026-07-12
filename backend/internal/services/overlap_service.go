package services

import (
	"bytes"
	"context"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	"github.com/kirantiwari/fingcheck/internal/config"
	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type OverlapService interface {
	UploadOverlap(ctx context.Context, overlap *models.OverlapFingerprint) (*models.OverlapFingerprint, error)
	GetOverlapByID(ctx context.Context, id primitive.ObjectID) (*models.OverlapFingerprint, error)
	GetAllOverlaps(ctx context.Context, page, pageSize int) ([]models.OverlapFingerprint, int64, error)
	ProcessOverlap(ctx context.Context, id primitive.ObjectID) error
	GetByUploader(ctx context.Context, uploaderID primitive.ObjectID) ([]models.OverlapFingerprint, error)
}

type overlapService struct {
	overlapRepo repository.OverlapRepository
	auditRepo   repository.AuditRepository
	cfg         *config.Config
	cloudinary  CloudinaryService
}

func NewOverlapService(overlapRepo repository.OverlapRepository, auditRepo repository.AuditRepository, cfg *config.Config, cloudinary CloudinaryService) OverlapService {
	return &overlapService{
		overlapRepo: overlapRepo,
		auditRepo:   auditRepo,
		cfg:         cfg,
		cloudinary:  cloudinary,
	}
}

func (s *overlapService) UploadOverlap(ctx context.Context, overlap *models.OverlapFingerprint) (*models.OverlapFingerprint, error) {
	overlap.ProcessingStatus = models.StatusPending
	if err := s.overlapRepo.Create(ctx, overlap); err != nil {
		return nil, err
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     overlap.UploadedBy,
		Action:     "overlap.uploaded",
		EntityType: "overlap_fingerprint",
		EntityID:   overlap.ID,
		NewValue:   fmt.Sprintf("original_image_url=%s", overlap.OriginalImageURL),
	})

	return overlap, nil
}

func (s *overlapService) GetOverlapByID(ctx context.Context, id primitive.ObjectID) (*models.OverlapFingerprint, error) {
	return s.overlapRepo.GetByID(ctx, id)
}

func (s *overlapService) GetAllOverlaps(ctx context.Context, page, pageSize int) ([]models.OverlapFingerprint, int64, error) {
	return s.overlapRepo.GetAll(ctx, page, pageSize)
}

type pythonExtractRequest struct {
	ImageBase64 string `json:"image_base64"`
}

type pythonExtractResponse struct {
	Status          string   `json:"status"`
	Message         string   `json:"message"`
	Confidence      float64  `json:"confidence"`
	OverlapBase64   string   `json:"overlap_base64"`
	SeparatedImages []string `json:"separated_images"`
}

func (s *overlapService) ProcessOverlap(ctx context.Context, id primitive.ObjectID) error {
	if err := s.overlapRepo.UpdateStatus(ctx, id, models.StatusProcessing, "Overlap processing started"); err != nil {
		return err
	}

	overlap, err := s.overlapRepo.GetByID(ctx, id)
	if err != nil {
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to load record: %v", err))
		return err
	}

	imgResp, err := http.Get(overlap.OriginalImageURL)
	if err != nil {
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to download original image file: %v", err))
		return err
	}
	defer imgResp.Body.Close()

	if imgResp.StatusCode != http.StatusOK {
		err = fmt.Errorf("status code %d", imgResp.StatusCode)
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to download original image file: %v", err))
		return err
	}

	imgBytes, err := io.ReadAll(imgResp.Body)
	if err != nil {
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to read downloaded image data: %v", err))
		return err
	}

	mimeType := "image/png"
	if strings.HasSuffix(strings.ToLower(overlap.OriginalImageURL), ".jpg") || strings.HasSuffix(strings.ToLower(overlap.OriginalImageURL), ".jpeg") {
		mimeType = "image/jpeg"
	}
	base64Image := fmt.Sprintf("data:%s;base64,%s", mimeType, base64.StdEncoding.EncodeToString(imgBytes))

	reqPayload := pythonExtractRequest{ImageBase64: base64Image}
	reqJSON, err := json.Marshal(reqPayload)
	if err != nil {
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to serialize request: %v", err))
		return err
	}

	url := fmt.Sprintf("%s/api/v1/fingerprint/extract", s.cfg.PythonServiceURL)
	req, err := http.NewRequestWithContext(ctx, "POST", url, bytes.NewBuffer(reqJSON))
	if err != nil {
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to create HTTP request: %v", err))
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	client := &http.Client{Timeout: 60 * time.Second}
	resp, err := client.Do(req)
	if err != nil {
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Python microservice connection failed: %v", err))
		return err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		bodyBytes, _ := io.ReadAll(resp.Body)
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Python microservice returned status %d: %s", resp.StatusCode, string(bodyBytes)))
		return fmt.Errorf("python service error status: %d", resp.StatusCode)
	}

	var extractResp pythonExtractResponse
	if err := json.NewDecoder(resp.Body).Decode(&extractResp); err != nil {
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to parse Python service response: %v", err))
		return err
	}

	separatedPaths := make([]string, 2)
	for i, base64Str := range extractResp.SeparatedImages {
		if i >= 2 {
			break
		}

		commaIdx := strings.Index(base64Str, ",")
		rawBase64 := base64Str
		if commaIdx != -1 {
			rawBase64 = base64Str[commaIdx+1:]
		}

		decodedBytes, err := base64.StdEncoding.DecodeString(rawBase64)
		if err != nil {
			_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to decode separated image %d: %v", i+1, err))
			return err
		}

		fileName := fmt.Sprintf("%s_separated_%d", id.Hex(), i+1)
		
		secureURL, err := s.cloudinary.UploadBytes(ctx, decodedBytes, fileName, "overlaps")
		if err != nil {
			_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to upload separated image %d to Cloudinary: %v", i+1, err))
			return err
		}

		separatedPaths[i] = secureURL
	}

	err = s.overlapRepo.UpdateSeparatedImages(ctx, id, separatedPaths[0], separatedPaths[1])
	if err != nil {
		_ = s.overlapRepo.UpdateStatus(ctx, id, models.StatusFailed, fmt.Sprintf("Failed to update paths in DB: %v", err))
		return err
	}

	statusMsg := fmt.Sprintf("Separation completed. Status: %s, Message: %s, Confidence: %.2f", extractResp.Status, extractResp.Message, extractResp.Confidence)
	err = s.overlapRepo.UpdateStatus(ctx, id, models.StatusCompleted, statusMsg)
	if err != nil {
		return err
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     primitive.NilObjectID,
		Action:     "overlap.processed",
		EntityType: "overlap_fingerprint",
		EntityID:   id,
		NewValue:   fmt.Sprintf("separated_1=%s, separated_2=%s", separatedPaths[0], separatedPaths[1]),
	})

	return nil
}

func (s *overlapService) GetByUploader(ctx context.Context, uploaderID primitive.ObjectID) ([]models.OverlapFingerprint, error) {
	return s.overlapRepo.GetByUploader(ctx, uploaderID)
}

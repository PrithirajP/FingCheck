package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/jtejido/sourceafis"
	"github.com/jtejido/sourceafis/config"
	"github.com/jtejido/sourceafis/features"
	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

// This runs once automatically when the server starts to boot up the algorithm
func init() {
	config.LoadDefaultConfig()
}

// A dummy logger that safely absorbs and discards SourceAFIS debug logs
type noopLogger struct{}

func (n *noopLogger) Log(key string, data interface{}) error { return nil }
func (n *noopLogger) LogSkeleton(keyword string, skeleton *features.Skeleton) error { return nil }

type FingerprintService interface {
	CreateFingerprint(ctx context.Context, fp *models.Fingerprint, imageBytes []byte, adminID primitive.ObjectID) (*models.Fingerprint, error)
	GetFingerprintByID(ctx context.Context, id primitive.ObjectID) (*models.Fingerprint, error)
	GetAllFingerprints(ctx context.Context, page, pageSize int, status string) ([]models.Fingerprint, int64, error)
	UpdateFingerprint(ctx context.Context, id primitive.ObjectID, updates map[string]interface{}, adminID primitive.ObjectID) (*models.Fingerprint, error)
	DeleteFingerprint(ctx context.Context, id primitive.ObjectID, adminID primitive.ObjectID) error
	GetAllActiveFingerprints(ctx context.Context) ([]models.Fingerprint, error)
}

type fingerprintService struct {
	fpRepo    repository.FingerprintRepository
	auditRepo repository.AuditRepository
}

func NewFingerprintService(fpRepo repository.FingerprintRepository, auditRepo repository.AuditRepository) FingerprintService {
	return &fingerprintService{
		fpRepo:    fpRepo,
		auditRepo: auditRepo,
	}
}

func (s *fingerprintService) CreateFingerprint(ctx context.Context, fp *models.Fingerprint, imageBytes []byte, adminID primitive.ObjectID) (*models.Fingerprint, error) {
	reader := bytes.NewReader(imageBytes)
	decodedImg, _, err := image.Decode(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image bytes: %w", err)
	}

	img, err := sourceafis.NewFromImage(decodedImg, sourceafis.WithResolution(500))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize SourceAFIS image: %w", err)
	}

	// THE FIX: Give the algorithm our safe dummy logger instead of nil
	creator := sourceafis.NewTemplateCreator(&noopLogger{})
	template, err := creator.Template(img)
	if err != nil {
		return nil, fmt.Errorf("failed to extract fingerprint template: %w", err)
	}

	templateBytes, err := json.Marshal(template)
	if err != nil {
		return nil, fmt.Errorf("failed to marshal fingerprint template: %w", err)
	}

	fp.TemplateData = string(templateBytes)
	fp.Status = models.FingerprintActive

	if err := s.fpRepo.Create(ctx, fp); err != nil {
		return nil, err
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     adminID,
		Action:     "fingerprint.created",
		EntityType: "fingerprint",
		EntityID:   fp.ID,
		NewValue:   fmt.Sprintf("label=%s, image_url=%s", fp.Label, fp.ImageURL),
	})

	return fp, nil
}

func (s *fingerprintService) GetFingerprintByID(ctx context.Context, id primitive.ObjectID) (*models.Fingerprint, error) {
	return s.fpRepo.GetByID(ctx, id)
}

func (s *fingerprintService) GetAllFingerprints(ctx context.Context, page, pageSize int, status string) ([]models.Fingerprint, int64, error) {
	return s.fpRepo.GetAll(ctx, page, pageSize, status)
}

func (s *fingerprintService) UpdateFingerprint(ctx context.Context, id primitive.ObjectID, updates map[string]interface{}, adminID primitive.ObjectID) (*models.Fingerprint, error) {
	fp, err := s.fpRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if v, ok := updates["label"].(string); ok {
		fp.Label = v
	}
	if v, ok := updates["status"].(string); ok {
		fp.Status = models.FingerprintStatus(v)
	}

	if err := s.fpRepo.Update(ctx, fp); err != nil {
		return nil, err
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     adminID,
		Action:     "fingerprint.updated",
		EntityType: "fingerprint",
		EntityID:   id,
		NewValue:   fmt.Sprintf("updates=%v", updates),
	})

	return fp, nil
}

func (s *fingerprintService) DeleteFingerprint(ctx context.Context, id primitive.ObjectID, adminID primitive.ObjectID) error {
	if err := s.fpRepo.Delete(ctx, id); err != nil {
		return err
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     adminID,
		Action:     "fingerprint.deleted",
		EntityType: "fingerprint",
		EntityID:   id,
	})

	return nil
}

func (s *fingerprintService) GetAllActiveFingerprints(ctx context.Context) ([]models.Fingerprint, error) {
	return s.fpRepo.GetAllActive(ctx)
}
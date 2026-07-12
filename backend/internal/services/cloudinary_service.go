package services

import (
	"bytes"
	"context"
	"fmt"
	"mime/multipart"
	"strings"
	"time"

	"github.com/cloudinary/cloudinary-go/v2"
	"github.com/cloudinary/cloudinary-go/v2/api/uploader"
	"github.com/kirantiwari/fingcheck/internal/config"
)

type CloudinaryService interface {
	UploadFile(ctx context.Context, file multipart.File, filename string, folder string) (string, error)
	UploadBytes(ctx context.Context, data []byte, filename string, folder string) (string, error)
}

type cloudinaryService struct {
	cld *cloudinary.Cloudinary
}

func NewCloudinaryService(cfg *config.Config) (CloudinaryService, error) {
	// Initialize Cloudinary with the URL from environment variables
	if cfg.CloudinaryURL == "" {
		return nil, fmt.Errorf("CLOUDINARY_URL environment variable is missing")
	}
	
	cld, err := cloudinary.NewFromURL(cfg.CloudinaryURL)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize Cloudinary: %w", err)
	}

	return &cloudinaryService{
		cld: cld,
	}, nil
}

func (s *cloudinaryService) UploadFile(ctx context.Context, file multipart.File, filename string, folder string) (string, error) {
	// Generate a unique public ID (Cloudinary filename) without the extension
	publicID := strings.TrimSuffix(filename, ".png")
	publicID = strings.TrimSuffix(publicID, ".jpg")
	publicID = strings.TrimSuffix(publicID, ".jpeg")
	
	// Ensure the context has a timeout to prevent hanging
	uploadCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	resp, err := s.cld.Upload.Upload(uploadCtx, file, uploader.UploadParams{
		Folder:   "fingcheck/" + folder,
		PublicID: publicID,
	})

	if err != nil {
		return "", fmt.Errorf("cloudinary upload error: %w", err)
	}

	return resp.SecureURL, nil
}

func (s *cloudinaryService) UploadBytes(ctx context.Context, data []byte, filename string, folder string) (string, error) {
	// Generate a unique public ID (Cloudinary filename) without the extension
	publicID := strings.TrimSuffix(filename, ".png")
	publicID = strings.TrimSuffix(publicID, ".jpg")
	publicID = strings.TrimSuffix(publicID, ".jpeg")

	uploadCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
	defer cancel()

	reader := bytes.NewReader(data)
	resp, err := s.cld.Upload.Upload(uploadCtx, reader, uploader.UploadParams{
		Folder:   "fingcheck/" + folder,
		PublicID: publicID,
	})

	if err != nil {
		return "", fmt.Errorf("cloudinary upload error: %w", err)
	}

	return resp.SecureURL, nil
}

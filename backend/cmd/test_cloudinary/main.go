package main

import (
	"context"
	"fmt"
	"log"
	"os"

	"github.com/kirantiwari/fingcheck/internal/config"
	"github.com/kirantiwari/fingcheck/internal/services"
)

func main() {
	cfg := config.Load()
	
	cloudinarySvc, err := services.NewCloudinaryService(cfg)
	if err != nil {
		log.Fatalf("Failed to init cloudinary: %v", err)
	}

	// create dummy file
	dummyPath := "dummy.png"
	err = os.WriteFile(dummyPath, []byte("dummy image data"), 0644)
	if err != nil {
		log.Fatalf("Failed to create dummy file: %v", err)
	}
	defer os.Remove(dummyPath)

	fileHandle, err := os.Open(dummyPath)
	if err != nil {
		log.Fatalf("Failed to open dummy file: %v", err)
	}
	defer fileHandle.Close()

	url, err := cloudinarySvc.UploadFile(context.Background(), fileHandle, "test_upload.png", "test")
	if err != nil {
		log.Fatalf("Upload failed: %v", err)
	}

	fmt.Println("Upload succeeded! URL:", url)
}

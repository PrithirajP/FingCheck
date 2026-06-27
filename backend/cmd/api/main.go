package main

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"
	"time"

	"github.com/clerk/clerk-sdk-go/v2"

	"github.com/kirantiwari/fingcheck/internal/config"
	"github.com/kirantiwari/fingcheck/internal/database"
	"github.com/kirantiwari/fingcheck/internal/handlers"
	"github.com/kirantiwari/fingcheck/internal/repository"
	"github.com/kirantiwari/fingcheck/internal/router"
	"github.com/kirantiwari/fingcheck/internal/services"
)

func main() {
	// 1. Load application configuration
	cfg := config.Load()
	log.Println("Configuration loaded successfully")

	// 2. Set Clerk API key for authentication
	clerk.SetKey(cfg.ClerkSecretKey)
	log.Println("Clerk API key configured")

	// 3. Connect to MongoDB
	db, err := database.Connect(cfg)
	if err != nil {
		log.Fatalf("Failed to connect to database: %v", err)
	}
	log.Println("Connected to MongoDB database")

	// 4. Create upload directories
	fingerprintDir := filepath.Join(cfg.UploadDir, "fingerprints")
	overlapsDir := filepath.Join(cfg.UploadDir, "overlaps")

	if err := os.MkdirAll(fingerprintDir, 0755); err != nil {
		log.Fatalf("Failed to create fingerprint upload directory: %v", err)
	}
	if err := os.MkdirAll(overlapsDir, 0755); err != nil {
		log.Fatalf("Failed to create overlaps upload directory: %v", err)
	}
	log.Printf("Upload directories created/verified at %s", cfg.UploadDir)

	// 5. Initialize repositories
	userRepo := repository.NewUserRepository(db)
	fpRepo := repository.NewFingerprintRepository(db)
	overlapRepo := repository.NewOverlapRepository(db)
	matchRepo := repository.NewMatchRepository(db)
	auditRepo := repository.NewAuditRepository(db)

	// 6. Initialize services
	userSvc := services.NewUserService(userRepo, auditRepo)
	fpSvc := services.NewFingerprintService(fpRepo, auditRepo)
	overlapSvc := services.NewOverlapService(overlapRepo, auditRepo, cfg)
	matchSvc := services.NewMatchService(matchRepo, overlapRepo, fpRepo, auditRepo)

	// 7. Initialize handlers
	authHandler := handlers.NewAuthHandler(userSvc, cfg.ClerkWebhookSecret)
	userHandler := handlers.NewUserHandler(userSvc)
	fpHandler := handlers.NewFingerprintHandler(fpSvc, cfg.UploadDir)
	overlapHandler := handlers.NewOverlapHandler(overlapSvc, cfg.UploadDir)
	matchHandler := handlers.NewMatchHandler(matchSvc)
	
	// ---> ADDED: Initialize the new AdminHandler <---
	adminHandler := handlers.NewAdminHandler(db)

	// 8. Build the Handlers struct for the router
	h := &router.Handlers{
		AuthHandler:    authHandler,
		UserHandler:    userHandler,
		FPHandler:      fpHandler,
		OverlapHandler: overlapHandler,
		MatchHandler:   matchHandler,
		
		// ---> ADDED: Inject AdminHandler into the struct <---
		AdminHandler:   adminHandler, 
		
		UserRepo:       userRepo,
	}

	// 9. Set up the Gin router
	r := router.SetupRouter(h, cfg)

	// 10. Configure HTTP server
	srv := &http.Server{
		Addr:         fmt.Sprintf(":%s", cfg.ServerPort),
		Handler:      r,
		ReadTimeout:  15 * time.Second,
		WriteTimeout: 15 * time.Second,
		IdleTimeout:  60 * time.Second,
	}

	// 11. Start the server in a goroutine
	go func() {
		log.Printf("FingCheck API server starting on port %s", cfg.ServerPort)
		if err := srv.ListenAndServe(); err != nil && err != http.ErrServerClosed {
			log.Fatalf("Server failed to start: %v", err)
		}
	}()

	// 12. Graceful shutdown
	quit := make(chan os.Signal, 1)
	signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
	<-quit
	log.Println("Shutting down server...")

	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	if err := srv.Shutdown(ctx); err != nil {
		log.Fatalf("Server forced to shutdown: %v", err)
	}

	// Close MongoDB client connection
	if err := db.Client().Disconnect(ctx); err != nil {
		log.Printf("Error disconnecting from MongoDB: %v", err)
	}

	log.Println("Server exited gracefully")
}
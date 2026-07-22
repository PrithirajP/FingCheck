package config

import (
	"log"
	"os"
	"strconv"

	"github.com/joho/godotenv"
)

// Config holds all configuration values for FingCheck.
type Config struct {
	ServerPort         string
	MongoURL           string
	DBName             string
	ClerkSecretKey     string
	ClerkWebhookSecret string
	UploadDir          string
	MaxUploadSize      int64
	PythonServiceURL   string
	CloudinaryURL      string
	CloudinaryCloudName string
	CloudinaryAPIKey    string
	CloudinaryAPISecret string
}

// Load loads configurations from .env or environment variables.
func Load() *Config {
	// Try loading .env. Ignore error as we might be running in envs with system variables set
	if err := godotenv.Load(); err != nil {
		log.Println("Info: .env file not loaded, using environment variables")
	}

	maxUploadSize, err := strconv.ParseInt(getEnv("MAX_UPLOAD_SIZE", "10485760"), 10, 64)
	if err != nil {
		log.Printf("Warning: invalid MAX_UPLOAD_SIZE, using default: %v", err)
		maxUploadSize = 10485760
	}

	return &Config{
		ServerPort:          getEnv("PORT", "8080"), // Default to 8080 to avoid conflict with Python service on 8000
		MongoURL:            getEnv("MONGO_URL", "mongodb://localhost:27017"),
		DBName:              getEnv("DB_NAME", "fingcheck"),
		ClerkSecretKey:      getEnv("CLERK_SECRET_KEY", ""),
		ClerkWebhookSecret:  getEnv("CLERK_WEBHOOK_SECRET", ""),
		UploadDir:           getEnv("UPLOAD_DIR", "./uploads"),
		MaxUploadSize:       maxUploadSize,
		PythonServiceURL:    getEnv("PYTHON_SERVICE_URL", "http://localhost:8000"),
		CloudinaryURL:       getEnv("CLOUDINARY_URL", ""),
		CloudinaryCloudName: getEnv("CLOUDINARY_CLOUD_NAME", ""),
		CloudinaryAPIKey:    getEnv("CLOUDINARY_API_KEY", ""),
		CloudinaryAPISecret: getEnv("CLOUDINARY_API_SECRET", getEnv("CLOUDINARY_SECRET_KEY", "")),
	}
}

func getEnv(key, fallback string) string {
	if value, exists := os.LookupEnv(key); exists && value != "" {
		return value
	}
	return fallback
}

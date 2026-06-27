package handlers

import (
	"context"
	"log" // <--- Added log package
	"net/http"

	"github.com/gin-gonic/gin"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
)

type AdminHandler struct {
	db *mongo.Database
}

func NewAdminHandler(db *mongo.Database) *AdminHandler {
	return &AdminHandler{db: db}
}

func (h *AdminHandler) GetSystemStats(c *gin.Context) {
	ctx := context.Background()

	// 1. Users
	userCount, err1 := h.db.Collection("users").CountDocuments(ctx, bson.M{})
	if err1 != nil {
		log.Printf("MongoDB Error counting users: %v", err1)
		userCount = 0
	}

	// 2. Targets
	targetCount, err2 := h.db.Collection("fingerprints").CountDocuments(ctx, bson.M{})
	if err2 != nil {
		log.Printf("MongoDB Error counting fingerprints: %v", err2)
		targetCount = 0
	}

	// 3. Overlaps
	overlapCount, err3 := h.db.Collection("overlaps").CountDocuments(ctx, bson.M{})
	if err3 != nil {
		log.Printf("MongoDB Error counting overlaps: %v", err3)
		overlapCount = 0
	}

	c.JSON(http.StatusOK, gin.H{
		"users":    userCount,
		"targets":  targetCount,
		"overlaps": overlapCount,
	})
}
package handlers

import (
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

// Define the struct so your router can recognize it
type AdminHandler struct {
	db *gorm.DB
}

// Constructor to initialize the handler with the database
func NewAdminHandler(db *gorm.DB) *AdminHandler {
	return &AdminHandler{db: db}
}

// The stats function for the frontend dashboard
func (h *AdminHandler) GetSystemStats(c *gin.Context) {
	var userCount, targetCount, overlapCount int64

	// Count total users
	h.db.Table("users").Count(&userCount)
	
	// Count target fingerprints
	h.db.Table("fingerprints").Count(&targetCount) 
	
	// Count total processed overlaps
	h.db.Table("overlaps").Count(&overlapCount)

	c.JSON(200, gin.H{
		"users":    userCount,
		"targets":  targetCount,
		"overlaps": overlapCount,
	})
}
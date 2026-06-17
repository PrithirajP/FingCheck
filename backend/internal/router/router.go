package router

import (
	"github.com/gin-gonic/gin"
	"github.com/kirantiwari/fingcheck/internal/config"
	"github.com/kirantiwari/fingcheck/internal/handlers"
	"github.com/kirantiwari/fingcheck/internal/middleware"
	"github.com/kirantiwari/fingcheck/internal/repository"
)

// Handlers holds references to all endpoint handlers and the database collection lookup
type Handlers struct {
	AuthHandler    *handlers.AuthHandler
	UserHandler    *handlers.UserHandler
	FPHandler      *handlers.FingerprintHandler
	OverlapHandler *handlers.OverlapHandler
	MatchHandler   *handlers.MatchHandler
	UserRepo       repository.UserRepository
}

// SetupRouter initializes Gin engine, middleware, and registers routes.
func SetupRouter(h *Handlers, cfg *config.Config) *gin.Engine {
	r := gin.Default()

	r.Use(CORSMiddleware())
	r.Static("/uploads", cfg.UploadDir)

	v1 := r.Group("/api/v1")
	{
		// Public webhook
		v1.POST("/webhooks/clerk", h.AuthHandler.HandleClerkWebhook)

		// Authenticated routes
		auth := v1.Group("")
		auth.Use(middleware.AuthMiddleware(h.UserRepo))
		{
			auth.GET("/me", h.UserHandler.GetProfile)
			auth.GET("/me/matches", h.MatchHandler.GetMyMatches)
			auth.POST("/match", h.MatchHandler.MatchFingerprint)
			auth.GET("/match/:id", h.MatchHandler.GetMatchResult)
			auth.GET("/overlaps/my", h.OverlapHandler.GetMyOverlaps)

			// Admin routes
			admin := auth.Group("/admin")
			admin.Use(middleware.RequireAdmin())
			{
				admin.GET("/users", h.UserHandler.GetAllUsers)
				admin.GET("/users/:id", h.UserHandler.GetUserByID)
				admin.PUT("/users/:id", h.UserHandler.UpdateUser)
				admin.DELETE("/users/:id", h.UserHandler.DeleteUser)
				admin.PUT("/users/:id/role", h.UserHandler.UpdateRole)

				admin.POST("/fingerprints", h.FPHandler.CreateFingerprint)
				admin.GET("/fingerprints", h.FPHandler.GetAllFingerprints)
				admin.GET("/fingerprints/:id", h.FPHandler.GetFingerprintByID)
				admin.PUT("/fingerprints/:id", h.FPHandler.UpdateFingerprint)
				admin.DELETE("/fingerprints/:id", h.FPHandler.DeleteFingerprint)

				admin.POST("/overlaps", h.OverlapHandler.UploadOverlap)
				admin.GET("/overlaps", h.OverlapHandler.GetAllOverlaps)
				admin.GET("/overlaps/:id", h.OverlapHandler.GetOverlapByID)

				admin.GET("/matches", h.MatchHandler.GetAllMatches)
			}
		}
	}

	return r
}

// CORSMiddleware configures CORS headers for cross-origin requests
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Writer.Header().Set("Access-Control-Allow-Origin", "*")
		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

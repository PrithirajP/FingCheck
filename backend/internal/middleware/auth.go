package middleware

import (
	"strings"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/gin-gonic/gin"
	"github.com/kirantiwari/fingcheck/internal/repository"
	"github.com/kirantiwari/fingcheck/pkg/response"
)

// AuthMiddleware verifies the Clerk JWT from the Authorization header,
// looks up the corresponding user in the database, and sets the user
// on the Gin context for downstream handlers.
func AuthMiddleware(userRepo repository.UserRepository) gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			response.Unauthorized(c, "Authorization header is required")
			c.Abort()
			return
		}

		parts := strings.SplitN(authHeader, " ", 2)
		if len(parts) != 2 || !strings.EqualFold(parts[0], "Bearer") {
			response.Unauthorized(c, "Authorization header must be in the format: Bearer <token>")
			c.Abort()
			return
		}

		token := parts[1]
		if token == "" {
			response.Unauthorized(c, "Bearer token is empty")
			c.Abort()
			return
		}

		claims, err := jwt.Verify(c.Request.Context(), &jwt.VerifyParams{
			Token: token,
		})
		if err != nil {
			response.Unauthorized(c, "Invalid or expired token")
			c.Abort()
			return
		}

		user, err := userRepo.GetByClerkID(c.Request.Context(), claims.Subject)
		if err != nil {
			response.Unauthorized(c, "User profile not found in database")
			c.Abort()
			return
		}

		if !user.IsActive {
			response.Forbidden(c, "User account is deactivated")
			c.Abort()
			return
		}

		c.Set("user", *user)
		c.Set("userID", user.ID)
		c.Next()
	}
}

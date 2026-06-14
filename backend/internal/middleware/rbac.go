package middleware

import (
	"github.com/gin-gonic/gin"
	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/pkg/response"
)

// RequireRole returns middleware that checks whether the authenticated user
// has one of the allowed roles. If not, it responds with 403 Forbidden.
func RequireRole(roles ...models.UserRole) gin.HandlerFunc {
	return func(c *gin.Context) {
		val, exists := c.Get("user")
		if !exists {
			response.Unauthorized(c, "Authentication required")
			c.Abort()
			return
		}

		user := val.(models.User)

		for _, role := range roles {
			if user.Role == role {
				c.Next()
				return
			}
		}

		response.Forbidden(c, "You do not have permission to access this resource")
		c.Abort()
	}
}

// RequireAdmin is a convenience wrapper that restricts access to admin users only.
func RequireAdmin() gin.HandlerFunc {
	return RequireRole(models.RoleAdmin)
}

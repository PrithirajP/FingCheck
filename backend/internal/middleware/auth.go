package middleware

import (
	"strings"

	"github.com/clerk/clerk-sdk-go/v2/jwt"
	"github.com/clerk/clerk-sdk-go/v2/user"
	"github.com/gin-gonic/gin"
	"github.com/kirantiwari/fingcheck/internal/models"
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

		u, err := userRepo.GetByClerkID(c.Request.Context(), claims.Subject)
		if err != nil {
			// User not found in DB. Let's try to fetch from Clerk and create them just-in-time
			// to handle cases where the webhook failed to fire.
			clerkUser, fetchErr := user.Get(c.Request.Context(), claims.Subject)
			if fetchErr != nil {
				response.Unauthorized(c, "User profile not found in database and failed to fetch from Clerk")
				c.Abort()
				return
			}

			newUser := &models.User{
				ClerkUserID: clerkUser.ID,
				IsActive:    true,
				Role:        models.RoleUser,
				AvatarURL:   clerkUser.ImageURL,
			}
			if len(clerkUser.EmailAddresses) > 0 {
				newUser.Email = clerkUser.EmailAddresses[0].EmailAddress
			}
			if clerkUser.FirstName != nil {
				newUser.FirstName = *clerkUser.FirstName
			}
			if clerkUser.LastName != nil {
				newUser.LastName = *clerkUser.LastName
			}

			if err := userRepo.Create(c.Request.Context(), newUser); err != nil {
				response.InternalError(c, "Failed to create user profile")
				c.Abort()
				return
			}
			
			u = newUser
		}

		if !u.IsActive {
			response.Forbidden(c, "User account is deactivated")
			c.Abort()
			return
		}

		c.Set("user", *u)
		c.Set("userID", u.ID)
		c.Next()
	}
}

package services

import (
	"context"
	"fmt"

	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/internal/repository"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserService interface {
	CreateUser(ctx context.Context, clerkUserID, email, firstName, lastName, avatarURL string) (*models.User, error)
	GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	GetUserByClerkID(ctx context.Context, clerkID string) (*models.User, error)
	GetAllUsers(ctx context.Context, page, pageSize int) ([]models.User, int64, error)
	UpdateUser(ctx context.Context, id primitive.ObjectID, updates map[string]interface{}) (*models.User, error)
	UpdateRole(ctx context.Context, id primitive.ObjectID, role models.UserRole, adminID primitive.ObjectID) (*models.User, error)
	DeleteUser(ctx context.Context, id primitive.ObjectID, adminID primitive.ObjectID) error
}

type userService struct {
	userRepo  repository.UserRepository
	auditRepo repository.AuditRepository
}

func NewUserService(userRepo repository.UserRepository, auditRepo repository.AuditRepository) UserService {
	return &userService{
		userRepo:  userRepo,
		auditRepo: auditRepo,
	}
}

func (s *userService) CreateUser(ctx context.Context, clerkUserID, email, firstName, lastName, avatarURL string) (*models.User, error) {
	existing, err := s.userRepo.GetByClerkID(ctx, clerkUserID)
	if err == nil && existing != nil {
		return existing, nil
	}

	role := models.RoleUser
	// First user is automatically admin for setup simplicity
	users, _, err := s.userRepo.GetAll(ctx, 1, 1)
	if err == nil && len(users) == 0 {
		role = models.RoleAdmin
	}

	user := &models.User{
		ClerkUserID: clerkUserID,
		Email:       email,
		FirstName:   firstName,
		LastName:    lastName,
		AvatarURL:   avatarURL,
		Role:        role,
		IsActive:    true,
	}

	if err := s.userRepo.Create(ctx, user); err != nil {
		return nil, err
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     user.ID,
		Action:     "user.created",
		EntityType: "user",
		EntityID:   user.ID,
		NewValue:   fmt.Sprintf("email=%s, role=%s", user.Email, user.Role),
	})

	return user, nil
}

func (s *userService) GetUserByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	return s.userRepo.GetByID(ctx, id)
}

func (s *userService) GetUserByClerkID(ctx context.Context, clerkID string) (*models.User, error) {
	return s.userRepo.GetByClerkID(ctx, clerkID)
}

func (s *userService) GetAllUsers(ctx context.Context, page, pageSize int) ([]models.User, int64, error) {
	return s.userRepo.GetAll(ctx, page, pageSize)
}

func (s *userService) UpdateUser(ctx context.Context, id primitive.ObjectID, updates map[string]interface{}) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	if v, ok := updates["first_name"].(string); ok {
		user.FirstName = v
	}
	if v, ok := updates["last_name"].(string); ok {
		user.LastName = v
	}
	if v, ok := updates["avatar_url"].(string); ok {
		user.AvatarURL = v
	}
	if v, ok := updates["is_active"].(bool); ok {
		user.IsActive = v
	}

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	return user, nil
}

func (s *userService) UpdateRole(ctx context.Context, id primitive.ObjectID, role models.UserRole, adminID primitive.ObjectID) (*models.User, error) {
	user, err := s.userRepo.GetByID(ctx, id)
	if err != nil {
		return nil, err
	}

	oldRole := user.Role
	user.Role = role

	if err := s.userRepo.Update(ctx, user); err != nil {
		return nil, err
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     adminID,
		Action:     "user.role_updated",
		EntityType: "user",
		EntityID:   id,
		OldValue:   string(oldRole),
		NewValue:   string(role),
	})

	return user, nil
}

func (s *userService) DeleteUser(ctx context.Context, id primitive.ObjectID, adminID primitive.ObjectID) error {
	if err := s.userRepo.Delete(ctx, id); err != nil {
		return err
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     adminID,
		Action:     "user.deleted",
		EntityType: "user",
		EntityID:   id,
	})

	return nil
}

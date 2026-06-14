package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type UserRole string

const (
	RoleAdmin UserRole = "admin"
	RoleUser  UserRole = "user"
)

type User struct {
	ID          primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	ClerkUserID string             `json:"clerk_user_id" bson:"clerk_user_id"`
	Email       string             `json:"email" bson:"email"`
	FirstName   string             `json:"first_name" bson:"first_name"`
	LastName    string             `json:"last_name" bson:"last_name"`
	AvatarURL   string             `json:"avatar_url" bson:"avatar_url"`
	Role        UserRole           `json:"role" bson:"role"`
	IsActive    bool               `json:"is_active" bson:"is_active"`
	CreatedAt   time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt   time.Time          `json:"updated_at" bson:"updated_at"`
	DeletedAt   *time.Time         `json:"deleted_at,omitempty" bson:"deleted_at,omitempty"`
}

func (u *User) FullName() string {
	return u.FirstName + " " + u.LastName
}

func (u *User) IsAdmin() bool {
	return u.Role == RoleAdmin
}

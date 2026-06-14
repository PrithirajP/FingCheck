package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type AuditLog struct {
	ID         primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UserID     primitive.ObjectID `json:"user_id" bson:"user_id"`
	Action     string             `json:"action" bson:"action"`
	EntityType string             `json:"entity_type" bson:"entity_type"`
	EntityID   primitive.ObjectID `json:"entity_id" bson:"entity_id"`
	OldValue   string             `json:"old_value" bson:"old_value"`
	NewValue   string             `json:"new_value" bson:"new_value"`
	IPAddress  string             `json:"ip_address" bson:"ip_address"`
	CreatedAt  time.Time          `json:"created_at" bson:"created_at"`
}

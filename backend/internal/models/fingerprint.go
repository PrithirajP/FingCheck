package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type FingerprintStatus string

const (
	FingerprintActive   FingerprintStatus = "active"
	FingerprintArchived FingerprintStatus = "archived"
	FingerprintDeleted  FingerprintStatus = "deleted"
)

type Fingerprint struct {
	ID           primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UploadedBy   primitive.ObjectID `json:"uploaded_by" bson:"uploaded_by"`
	Label        string             `json:"label" bson:"label"`
	ImageURL     string             `json:"image_url" bson:"image_url"`
	TemplateData string             `json:"template_data" bson:"template_data"`
	Metadata     map[string]any     `json:"metadata" bson:"metadata"`
	Status       FingerprintStatus  `json:"status" bson:"status"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at" bson:"updated_at"`
}

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
	FullName     string             `json:"full_name" bson:"full_name"`
	Age          int                `json:"age" bson:"age"`
	Gender       string             `json:"gender" bson:"gender"`
	ProofType    string             `json:"proof_type" bson:"proof_type"`
	ProofID      string             `json:"proof_id" bson:"proof_id"`
	Contact      string             `json:"contact" bson:"contact"`
	Address      string             `json:"address" bson:"address"`
	Metadata     map[string]any     `json:"metadata" bson:"metadata"`
	Status       FingerprintStatus  `json:"status" bson:"status"`
	CreatedAt    time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt    time.Time          `json:"updated_at" bson:"updated_at"`
}

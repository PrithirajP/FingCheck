package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type ProcessingStatus string

const (
	StatusPending    ProcessingStatus = "pending"
	StatusProcessing ProcessingStatus = "processing"
	StatusCompleted  ProcessingStatus = "completed"
	StatusFailed     ProcessingStatus = "failed"
)

type OverlapFingerprint struct {
	ID                 primitive.ObjectID `json:"id" bson:"_id,omitempty"`
	UploadedBy         primitive.ObjectID `json:"uploaded_by" bson:"uploaded_by"`
	OriginalImageURL   string             `json:"original_image_url" bson:"original_image_url"`
	SeparatedImage1URL string             `json:"separated_image_1_url" bson:"separated_image_1_url"`
	SeparatedImage2URL string             `json:"separated_image_2_url" bson:"separated_image_2_url"`
	ProcessingStatus   ProcessingStatus   `json:"processing_status" bson:"processing_status"`
	ProcessingLog      string             `json:"processing_log" bson:"processing_log"`
	CreatedAt          time.Time          `json:"created_at" bson:"created_at"`
	UpdatedAt          time.Time          `json:"updated_at" bson:"updated_at"`
}

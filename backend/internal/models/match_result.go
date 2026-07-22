package models

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MatchResult struct {
	ID                   primitive.ObjectID  `json:"id" bson:"_id,omitempty"`
	OverlapFingerprintID primitive.ObjectID  `json:"overlap_fingerprint_id,omitempty" bson:"overlap_fingerprint_id,omitempty"`
	MatchedFingerprintID *primitive.ObjectID `json:"matched_fingerprint_id,omitempty" bson:"matched_fingerprint_id,omitempty"`
	MatchedFingerprint   *Fingerprint        `json:"matched_fingerprint,omitempty" bson:"-"`
	SearchedBy           primitive.ObjectID  `json:"searched_by" bson:"searched_by"`
	ComponentIndex       int                 `json:"component_index" bson:"component_index"`
	ConfidenceScore      float64             `json:"confidence_score" bson:"confidence_score"`
	IsMatch              bool                `json:"is_match" bson:"is_match"`
	MatchDetails         map[string]any      `json:"match_details" bson:"match_details"`
	CreatedAt            time.Time           `json:"created_at" bson:"created_at"`
}

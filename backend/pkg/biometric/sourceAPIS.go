package biometric

import (
	"bytes"
	"context"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/jtejido/sourceafis"
	"github.com/jtejido/sourceafis/templates"
)

// MatchResult represents the outcome of the SourceAFIS matching process.
type MatchResult struct {
	IsMatch  bool                      // True if the score > threshold
	UserID   string                    // Populated if IsMatch is true
	Score    float64                   // The actual confidence score
	Template *templates.SearchTemplate // Returned so the caller can save it if it's a new user
}

// UserRecord represents a stored template in your database.
type UserRecord struct {
	UserID   string
	Template *templates.SearchTemplate
}

// MatchThreshold is the standard SourceAFIS threshold for a verified biometric match.
const MatchThreshold = 40.0

// ProcessBiometricMatch takes the cleaned image bytes and compares them against the database.
func ProcessBiometricMatch(ctx context.Context, cleanedImageBytes []byte, database []UserRecord) (*MatchResult, error) {
	// 1. Decode the raw image bytes into an image.Image
	reader := bytes.NewReader(cleanedImageBytes)
	decodedImg, _, err := image.Decode(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image bytes: %w", err)
	}

	// 2. Initialize the SourceAFIS Image with 500 DPI resolution
	img, err := sourceafis.NewFromImage(decodedImg, sourceafis.WithResolution(500))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize SourceAFIS image: %w", err)
	}

	// 3. Extract the Minutiae Template
	creator := sourceafis.NewTemplateCreator(nil)
	probeTemplate, err := creator.Template(img)
	if err != nil {
		return nil, fmt.Errorf("failed to extract fingerprint template: %w", err)
	}

	// 4. Initialize Matcher
	matcher, err := sourceafis.NewMatcher(nil, probeTemplate)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize SourceAFIS matcher: %w", err)
	}

	var bestMatchID string
	highestScore := 0.0

	// 5. Compare against existing database records
	for _, record := range database {
		score := matcher.Match(ctx, record.Template)
		if score > highestScore {
			highestScore = score
			bestMatchID = record.UserID
		}
	}

	// 6. Evaluate the Score and format the result
	result := &MatchResult{
		Score:    highestScore,
		Template: probeTemplate,
	}

	if highestScore >= MatchThreshold {
		result.IsMatch = true
		result.UserID = bestMatchID
	} else {
		result.IsMatch = false
	}

	return result, nil
}

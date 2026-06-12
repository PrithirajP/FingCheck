package biometric

import (
	"fmt"

	"github.com/jtejido/sourceafis"
)

// MatchResult represents the outcome of the SourceAFIS matching process.
type MatchResult struct {
	IsMatch  bool                            // True if the score > threshold
	UserID   string                          // Populated if IsMatch is true
	Score    float64                         // The actual confidence score
	Template *sourceafis.FingerprintTemplate // Returned so the caller can save it if it's a new user
}

// UserRecord represents a stored template in your database.
type UserRecord struct {
	UserID   string
	Template *sourceafis.FingerprintTemplate
}

// MatchThreshold is the standard SourceAFIS threshold for a verified biometric match.
const MatchThreshold = 40.0

// ProcessBiometricMatch takes the cleaned image bytes and compares them against the database.
func ProcessBiometricMatch(cleanedImageBytes []byte, database []UserRecord) (*MatchResult, error) {
	// 1. Initialize and decode the SourceAFIS Image
	img := sourceafis.NewFingerprintImage()
	
	// DPI must be explicitly set to 500 for standard biometric processing
	err := img.Decode(cleanedImageBytes, &sourceafis.ImageOptions{DPI: 500})
	if err != nil {
		return nil, fmt.Errorf("failed to decode image in SourceAFIS: %w", err)
	}

	// 2. Extract the Minutiae Template
	probeTemplate, err := sourceafis.NewFingerprintTemplate(img)
	if err != nil {
		return nil, fmt.Errorf("failed to extract fingerprint template: %w", err)
	}

	// 3. Initialize Matcher
	matcher := sourceafis.NewFingerprintMatcher(probeTemplate)

	var bestMatchID string
	highestScore := 0.0

	// 4. Compare against existing database records
	for _, record := range database {
		score := matcher.Match(record.Template)
		if score > highestScore {
			highestScore = score
			bestMatchID = record.UserID
		}
	}

	// 5. Evaluate the Score and format the result
	result := &MatchResult{
		Score:    highestScore,
		Template: probeTemplate, // Pass the template back so the HTTP handler can save it if needed
	}

	if highestScore >= MatchThreshold {
		result.IsMatch = true
		result.UserID = bestMatchID
	} else {
		result.IsMatch = false
		// If IsMatch is false, the outer developer uses result.Template to save the new user to the DB.
	}

	return result, nil
}
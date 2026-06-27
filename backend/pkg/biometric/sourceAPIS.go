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
	IsMatch  bool
	UserID   string
	Score    float64
	Template *templates.SearchTemplate
}

type UserRecord struct {
	UserID   string
	Template *templates.SearchTemplate
}

const MatchThreshold = 40.0

// safeTransparency implements the sourceafis.Transparency interface.
// By returning false for Accepts, it tells the internal logger to skip all logging safely.
type safeTransparency struct{}

func (s *safeTransparency) Accepts(key string) bool                    { return false }
func (s *safeTransparency) Accept(key, mime string, data []byte) error { return nil }

// getSafeLogger initializes the library's native, crash-proof default logger
func getSafeLogger() *sourceafis.DefaultTransparencyLogger {
	return sourceafis.NewTransparencyLogger(&safeTransparency{})
}

func ProcessBiometricMatch(ctx context.Context, cleanedImageBytes []byte, database []UserRecord) (*MatchResult, error) {
	reader := bytes.NewReader(cleanedImageBytes)
	decodedImg, _, err := image.Decode(reader)
	if err != nil {
		return nil, fmt.Errorf("failed to decode image bytes: %w", err)
	}

	img, err := sourceafis.NewFromImage(decodedImg, sourceafis.WithResolution(500))
	if err != nil {
		return nil, fmt.Errorf("failed to initialize SourceAFIS image: %w", err)
	}

	// Provide the official library logger to prevent the SkeletonTracer panic
	creator := sourceafis.NewTemplateCreator(getSafeLogger())
	probeTemplate, err := creator.Template(img)
	if err != nil {
		return nil, fmt.Errorf("failed to extract fingerprint template: %w", err)
	}

	matcher, err := sourceafis.NewMatcher(getSafeLogger(), probeTemplate)
	if err != nil {
		return nil, fmt.Errorf("failed to initialize SourceAFIS matcher: %w", err)
	}

	var bestMatchID string
	highestScore := 0.0

	for _, record := range database {
		score := matcher.Match(ctx, record.Template)
		if score > highestScore {
			highestScore = score
			bestMatchID = record.UserID
		}
	}

	result := &MatchResult{
		Score:    highestScore,
		Template: probeTemplate,
	}

	result.IsMatch = highestScore >= MatchThreshold
	if result.IsMatch {
		result.UserID = bestMatchID
	}

	return result, nil
}

func CompareTwoPrints(img1Bytes []byte, img2Bytes []byte) (float64, bool, error) {
	// Helper to safely extract templates
	extract := func(data []byte) (*templates.SearchTemplate, error) {
		img, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		afisImg, _ := sourceafis.NewFromImage(img, sourceafis.WithResolution(500))
		
		creator := sourceafis.NewTemplateCreator(getSafeLogger())
		return creator.Template(afisImg)
	}

	template1, err := extract(img1Bytes)
	if err != nil {
		return 0, false, fmt.Errorf("failed to extract template 1: %w", err)
	}

	template2, err := extract(img2Bytes)
	if err != nil {
		return 0, false, fmt.Errorf("failed to extract template 2: %w", err)
	}

	matcher, err := sourceafis.NewMatcher(getSafeLogger(), template1)
	if err != nil {
		return 0, false, fmt.Errorf("failed to initialize matcher: %w", err)
	}

	score := matcher.Match(context.Background(), template2)
	return score, score >= MatchThreshold, nil
}
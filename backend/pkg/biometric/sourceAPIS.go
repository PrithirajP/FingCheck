package biometric

import (
	"bytes"
	"context"
	"fmt"
	"image"
	_ "image/jpeg"
	_ "image/png"

	"github.com/jtejido/sourceafis"
	"github.com/jtejido/sourceafis/extractor/logger"
	"github.com/jtejido/sourceafis/templates"
)

// noopLogger implements TransparencyLogger to silence all internal logs
type noopLogger struct{ logger.TransparencyLogger }
func (n *noopLogger) Log(key string, data interface{}) error { return nil }
func (n *noopLogger) Accepts(key string) bool                { return false }

// Global configuration with logging explicitly disabled
var afisConfig = &sourceafis.Config{
	TransparencyLogger: &noopLogger{},
}

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

// Helper to create a template using the global configuration
func getTemplate(img *sourceafis.FingerprintImage) (*templates.SearchTemplate, error) {
	// Using NewTemplateCreatorWithConfig ensures the logger propagates to all sub-components
	creator := sourceafis.NewTemplateCreatorWithConfig(afisConfig)
	return creator.Template(img)
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

	probeTemplate, err := getTemplate(img)
	if err != nil {
		return nil, fmt.Errorf("failed to extract fingerprint template: %w", err)
	}

	// Use config in matcher as well for consistency
	matcher := sourceafis.NewMatcherWithConfig(afisConfig, probeTemplate)

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
	extract := func(data []byte) (*templates.SearchTemplate, error) {
		img, _, err := image.Decode(bytes.NewReader(data))
		if err != nil {
			return nil, err
		}
		afisImg, _ := sourceafis.NewFromImage(img, sourceafis.WithResolution(500))
		return getTemplate(afisImg)
	}

	template1, err := extract(img1Bytes)
	if err != nil {
		return 0, false, fmt.Errorf("failed to extract template 1: %w", err)
	}

	template2, err := extract(img2Bytes)
	if err != nil {
		return 0, false, fmt.Errorf("failed to extract template 2: %w", err)
	}

	matcher := sourceafis.NewMatcherWithConfig(afisConfig, template1)
	score := matcher.Match(context.Background(), template2)
	
	return score, score >= MatchThreshold, nil
}
package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"os"
	"time"

	"github.com/jtejido/sourceafis/templates"
	"github.com/kirantiwari/fingcheck/internal/models"
	"github.com/kirantiwari/fingcheck/internal/repository"
	"github.com/kirantiwari/fingcheck/pkg/biometric"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type MatchService interface {
	MatchFingerprint(ctx context.Context, overlapID primitive.ObjectID, searcherID primitive.ObjectID) ([]models.MatchResult, error)
	GetMatchByID(ctx context.Context, id primitive.ObjectID) (*models.MatchResult, error)
	GetMatchesByOverlapID(ctx context.Context, overlapID primitive.ObjectID) ([]models.MatchResult, error)
	GetMatchesByUser(ctx context.Context, userID primitive.ObjectID, page, pageSize int) ([]models.MatchResult, int64, error)
	GetAllMatches(ctx context.Context, page, pageSize int) ([]models.MatchResult, int64, error)
	DirectMatch(ctx context.Context, imageBytes []byte, searcherID primitive.ObjectID) ([]models.MatchResult, error)
	
	// ADDED: The missing interface definition for Audit Logs
	GetAllAuditLogs(ctx context.Context, page, pageSize int) ([]models.AuditLog, int64, error)
}

type matchService struct {
	matchRepo   repository.MatchRepository
	overlapRepo repository.OverlapRepository
	fpRepo      repository.FingerprintRepository
	auditRepo   repository.AuditRepository
}

func NewMatchService(
	matchRepo repository.MatchRepository,
	overlapRepo repository.OverlapRepository,
	fpRepo repository.FingerprintRepository,
	auditRepo repository.AuditRepository,
) MatchService {
	return &matchService{
		matchRepo:   matchRepo,
		overlapRepo: overlapRepo,
		fpRepo:      fpRepo,
		auditRepo:   auditRepo,
	}
}

func (s *matchService) MatchFingerprint(ctx context.Context, overlapID primitive.ObjectID, searcherID primitive.ObjectID) ([]models.MatchResult, error) {
	overlap, err := s.overlapRepo.GetByID(ctx, overlapID)
	if err != nil {
		return nil, fmt.Errorf("overlap fingerprint not found: %w", err)
	}

	if overlap.ProcessingStatus != models.StatusCompleted {
		return nil, fmt.Errorf("overlap fingerprint is not yet processed, status is: %s", overlap.ProcessingStatus)
	}

	fingerprints, err := s.fpRepo.GetAllActive(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to get active fingerprints: %w", err)
	}

	var dbRecords []biometric.UserRecord
	for _, fp := range fingerprints {
		var tpl templates.SearchTemplate
		if err := json.Unmarshal([]byte(fp.TemplateData), &tpl); err != nil {
			log.Printf("Warning: failed to deserialize template for fingerprint %s: %v", fp.ID.Hex(), err)
			continue
		}
		dbRecords = append(dbRecords, biometric.UserRecord{
			UserID:   fp.ID.Hex(),
			Template: &tpl,
		})
	}

	var results []models.MatchResult

	components := []struct {
		Path  string
		Index int
	}{
		{Path: overlap.SeparatedImage1URL, Index: 1},
		{Path: overlap.SeparatedImage2URL, Index: 2},
	}

	for _, comp := range components {
		if comp.Path == "" {
			continue
		}

		imgBytes, err := os.ReadFile(comp.Path)
		if err != nil {
			log.Printf("Warning: failed to read separated image at %s: %v", comp.Path, err)
			continue
		}

		var matchedFPID *primitive.ObjectID
		isMatch := false
		score := 0.0

		if len(dbRecords) > 0 {
			matchRes, err := biometric.ProcessBiometricMatch(ctx, imgBytes, dbRecords)
			if err != nil {
				log.Printf("Warning: biometric match failed for component %d: %v", comp.Index, err)
			} else {
				isMatch = matchRes.IsMatch
				score = matchRes.Score
				if isMatch {
					parsedID, err := primitive.ObjectIDFromHex(matchRes.UserID)
					if err == nil {
						matchedFPID = &parsedID
					}
				}
			}
		}

		matchResult := models.MatchResult{
			ID:                   primitive.NewObjectID(),
			OverlapFingerprintID: overlapID,
			MatchedFingerprintID: matchedFPID,
			SearchedBy:           searcherID,
			ComponentIndex:       comp.Index,
			ConfidenceScore:      score,
			IsMatch:              isMatch,
			MatchDetails:         map[string]any{"engine": "SourceAFIS"},
		}

		if err := s.matchRepo.Create(ctx, &matchResult); err != nil {
			return nil, fmt.Errorf("failed to save match result: %w", err)
		}

		results = append(results, matchResult)
	}

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     searcherID,
		Action:     "match.executed",
		EntityType: "overlap_fingerprint",
		EntityID:   overlapID,
		NewValue:   fmt.Sprintf("total_results=%d, fingerprints_compared=%d", len(results), len(dbRecords)),
	})

	return results, nil
}

func (s *matchService) GetMatchByID(ctx context.Context, id primitive.ObjectID) (*models.MatchResult, error) {
	return s.matchRepo.GetByID(ctx, id)
}

func (s *matchService) GetMatchesByOverlapID(ctx context.Context, overlapID primitive.ObjectID) ([]models.MatchResult, error) {
	return s.matchRepo.GetByOverlapID(ctx, overlapID)
}

func (s *matchService) GetMatchesByUser(ctx context.Context, userID primitive.ObjectID, page, pageSize int) ([]models.MatchResult, int64, error) {
	return s.matchRepo.GetBySearcher(ctx, userID, page, pageSize)
}

func (s *matchService) GetAllMatches(ctx context.Context, page, pageSize int) ([]models.MatchResult, int64, error) {
	return s.matchRepo.GetAll(ctx, page, pageSize)
}

func (s *matchService) DirectMatch(ctx context.Context, imageBytes []byte, searcherID primitive.ObjectID) ([]models.MatchResult, error) {
	dbRecords, err := s.fpRepo.GetAllActive(ctx)
	if err != nil {
		return nil, fmt.Errorf("failed to fetch target database: %w", err)
	}

	var biometricDB []biometric.UserRecord
	for _, record := range dbRecords {
		if record.TemplateData == "" {
			continue
		}
		var t templates.SearchTemplate
		if err := json.Unmarshal([]byte(record.TemplateData), &t); err == nil {
			biometricDB = append(biometricDB, biometric.UserRecord{
				UserID:   record.ID.Hex(),
				Template: &t,
			})
		}
	}

	res, err := biometric.ProcessBiometricMatch(ctx, imageBytes, biometricDB)
	if err != nil {
		return nil, fmt.Errorf("biometric engine error: %w", err)
	}

	var results []models.MatchResult
	matchResult := models.MatchResult{
		ID:              primitive.NewObjectID(),
		SearchedBy:      searcherID,
		ComponentIndex:  0,
		ConfidenceScore: 0,
		IsMatch:         false,
		MatchDetails:    map[string]any{"engine": "SourceAFIS", "type": "direct_upload"},
		CreatedAt:       time.Now(),
	}

	if res != nil && res.IsMatch {
		matchedFPID, _ := primitive.ObjectIDFromHex(res.UserID)
		matchResult.MatchedFingerprintID = &matchedFPID
		matchResult.ConfidenceScore = res.Score
		matchResult.IsMatch = true
	}

	_ = s.matchRepo.Create(ctx, &matchResult)
	results = append(results, matchResult)

	_ = s.auditRepo.Create(ctx, &models.AuditLog{
		UserID:     searcherID,
		Action:     "match.direct_executed",
		EntityType: "direct_fingerprint",
		NewValue:   fmt.Sprintf("is_match=%v, score=%f", matchResult.IsMatch, matchResult.ConfidenceScore),
	})

	return results, nil
}

// ADDED: The missing function implementation
func (s *matchService) GetAllAuditLogs(ctx context.Context, page, pageSize int) ([]models.AuditLog, int64, error) {
	logs, err := s.auditRepo.GetAll(ctx)
	if err != nil {
		return nil, 0, err
	}
	
	// Reverse the logs so the newest ones are at the top of your dashboard
	for i, j := 0, len(logs)-1; i < j; i, j = i+1, j-1 {
		logs[i], logs[j] = logs[j], logs[i]
	}

	return logs, int64(len(logs)), nil
}
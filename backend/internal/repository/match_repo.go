package repository

import (
	"context"
	"time"

	"github.com/kirantiwari/fingcheck/internal/models"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

type MatchRepository interface {
	Create(ctx context.Context, match *models.MatchResult) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.MatchResult, error)
	GetByOverlapID(ctx context.Context, overlapID primitive.ObjectID) ([]models.MatchResult, error)
	GetBySearcher(ctx context.Context, searcherID primitive.ObjectID, page, pageSize int) ([]models.MatchResult, int64, error)
	GetAll(ctx context.Context, page, pageSize int) ([]models.MatchResult, int64, error)
}

type matchRepo struct {
	collection *mongo.Collection
}

func NewMatchRepository(db *mongo.Database) MatchRepository {
	return &matchRepo{
		collection: db.Collection("matches"),
	}
}

func (r *matchRepo) Create(ctx context.Context, match *models.MatchResult) error {
	if match.ID.IsZero() {
		match.ID = primitive.NewObjectID()
	}
	match.CreatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, match)
	return err
}

func (r *matchRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.MatchResult, error) {
	var match models.MatchResult
	filter := bson.M{"_id": id}
	err := r.collection.FindOne(ctx, filter).Decode(&match)
	if err != nil {
		return nil, err
	}
	return &match, nil
}

func (r *matchRepo) GetByOverlapID(ctx context.Context, overlapID primitive.ObjectID) ([]models.MatchResult, error) {
	filter := bson.M{"overlap_fingerprint_id": overlapID}
	findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.collection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var matches []models.MatchResult
	if err := cursor.All(ctx, &matches); err != nil {
		return nil, err
	}

	return matches, nil
}

func (r *matchRepo) GetBySearcher(ctx context.Context, searcherID primitive.ObjectID, page, pageSize int) ([]models.MatchResult, int64, error) {
	filter := bson.M{"searched_by": searcherID}
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := int64((page - 1) * pageSize)
	findOpts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(pageSize))

	cursor, err := r.collection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var matches []models.MatchResult
	if err := cursor.All(ctx, &matches); err != nil {
		return nil, 0, err
	}

	return matches, total, nil
}

func (r *matchRepo) GetAll(ctx context.Context, page, pageSize int) ([]models.MatchResult, int64, error) {
	filter := bson.M{}
	total, err := r.collection.CountDocuments(ctx, filter)
	if err != nil {
		return nil, 0, err
	}

	skip := int64((page - 1) * pageSize)
	findOpts := options.Find().
		SetSort(bson.D{{Key: "created_at", Value: -1}}).
		SetSkip(skip).
		SetLimit(int64(pageSize))

	cursor, err := r.collection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, 0, err
	}
	defer cursor.Close(ctx)

	var matches []models.MatchResult
	if err := cursor.All(ctx, &matches); err != nil {
		return nil, 0, err
	}

	return matches, total, nil
}

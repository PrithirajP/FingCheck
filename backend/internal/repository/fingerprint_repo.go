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

type FingerprintRepository interface {
	Create(ctx context.Context, fp *models.Fingerprint) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.Fingerprint, error)
	GetAll(ctx context.Context, page, pageSize int, status string) ([]models.Fingerprint, int64, error)
	GetAllActive(ctx context.Context) ([]models.Fingerprint, error)
	Update(ctx context.Context, fp *models.Fingerprint) error
	Delete(ctx context.Context, id primitive.ObjectID) error
}

type fingerprintRepo struct {
	collection *mongo.Collection
}

func NewFingerprintRepository(db *mongo.Database) FingerprintRepository {
	return &fingerprintRepo{
		collection: db.Collection("fingerprints"),
	}
}

func (r *fingerprintRepo) Create(ctx context.Context, fp *models.Fingerprint) error {
	if fp.ID.IsZero() {
		fp.ID = primitive.NewObjectID()
	}
	fp.CreatedAt = time.Now()
	fp.UpdatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, fp)
	return err
}

func (r *fingerprintRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.Fingerprint, error) {
	var fp models.Fingerprint
	filter := bson.M{"_id": id, "status": bson.M{"$ne": models.FingerprintDeleted}}
	err := r.collection.FindOne(ctx, filter).Decode(&fp)
	if err != nil {
		return nil, err
	}
	return &fp, nil
}

func (r *fingerprintRepo) GetAll(ctx context.Context, page, pageSize int, status string) ([]models.Fingerprint, int64, error) {
	filter := bson.M{}
	if status != "" {
		filter["status"] = status
	} else {
		filter["status"] = bson.M{"$ne": models.FingerprintDeleted}
	}

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

	var fingerprints []models.Fingerprint
	if err := cursor.All(ctx, &fingerprints); err != nil {
		return nil, 0, err
	}

	return fingerprints, total, nil
}

func (r *fingerprintRepo) GetAllActive(ctx context.Context) ([]models.Fingerprint, error) {
	filter := bson.M{"status": models.FingerprintActive}
	cursor, err := r.collection.Find(ctx, filter)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var fingerprints []models.Fingerprint
	if err := cursor.All(ctx, &fingerprints); err != nil {
		return nil, err
	}

	return fingerprints, nil
}

func (r *fingerprintRepo) Update(ctx context.Context, fp *models.Fingerprint) error {
	fp.UpdatedAt = time.Now()
	filter := bson.M{"_id": fp.ID}
	update := bson.M{"$set": fp}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *fingerprintRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	now := time.Now()
	filter := bson.M{"_id": id}
	update := bson.M{"$set": bson.M{"status": models.FingerprintDeleted, "updated_at": now}}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

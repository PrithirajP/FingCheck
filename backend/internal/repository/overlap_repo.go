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

type OverlapRepository interface {
	Create(ctx context.Context, overlap *models.OverlapFingerprint) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.OverlapFingerprint, error)
	GetAll(ctx context.Context, page, pageSize int) ([]models.OverlapFingerprint, int64, error)
	GetByUploader(ctx context.Context, uploaderID primitive.ObjectID) ([]models.OverlapFingerprint, error)
	Update(ctx context.Context, overlap *models.OverlapFingerprint) error
	UpdateStatus(ctx context.Context, id primitive.ObjectID, status models.ProcessingStatus, logMsg string) error
	UpdateSeparatedImages(ctx context.Context, id primitive.ObjectID, img1, img2 string) error
}

type overlapRepo struct {
	collection *mongo.Collection
}

func NewOverlapRepository(db *mongo.Database) OverlapRepository {
	return &overlapRepo{
		collection: db.Collection("overlaps"),
	}
}

func (r *overlapRepo) Create(ctx context.Context, overlap *models.OverlapFingerprint) error {
	if overlap.ID.IsZero() {
		overlap.ID = primitive.NewObjectID()
	}
	overlap.CreatedAt = time.Now()
	overlap.UpdatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, overlap)
	return err
}

func (r *overlapRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.OverlapFingerprint, error) {
	var overlap models.OverlapFingerprint
	filter := bson.M{"_id": id}
	err := r.collection.FindOne(ctx, filter).Decode(&overlap)
	if err != nil {
		return nil, err
	}
	return &overlap, nil
}

func (r *overlapRepo) GetAll(ctx context.Context, page, pageSize int) ([]models.OverlapFingerprint, int64, error) {
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

	var overlaps []models.OverlapFingerprint
	if err := cursor.All(ctx, &overlaps); err != nil {
		return nil, 0, err
	}

	return overlaps, total, nil
}

func (r *overlapRepo) GetByUploader(ctx context.Context, uploaderID primitive.ObjectID) ([]models.OverlapFingerprint, error) {
	filter := bson.M{"uploaded_by": uploaderID}
	findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.collection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var overlaps []models.OverlapFingerprint
	if err := cursor.All(ctx, &overlaps); err != nil {
		return nil, err
	}

	return overlaps, nil
}

func (r *overlapRepo) Update(ctx context.Context, overlap *models.OverlapFingerprint) error {
	overlap.UpdatedAt = time.Now()
	filter := bson.M{"_id": overlap.ID}
	update := bson.M{"$set": overlap}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *overlapRepo) UpdateStatus(ctx context.Context, id primitive.ObjectID, status models.ProcessingStatus, logMsg string) error {
	now := time.Now()
	filter := bson.M{"_id": id}
	update := bson.M{"$set": bson.M{
		"processing_status": status,
		"processing_log":    logMsg,
		"updated_at":        now,
	}}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *overlapRepo) UpdateSeparatedImages(ctx context.Context, id primitive.ObjectID, img1, img2 string) error {
	now := time.Now()
	filter := bson.M{"_id": id}
	update := bson.M{"$set": bson.M{
		"separated_image_1_url": img1,
		"separated_image_2_url": img2,
		"updated_at":            now,
	}}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

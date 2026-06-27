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

type AuditRepository interface {
	Create(ctx context.Context, audit *models.AuditLog) error
	GetByEntity(ctx context.Context, entityType string, entityID primitive.ObjectID) ([]models.AuditLog, error)
	GetByUser(ctx context.Context, userID primitive.ObjectID, page, pageSize int) ([]models.AuditLog, int64, error)
	GetAll(ctx context.Context) ([]models.AuditLog, error)
}

type auditRepo struct {
	collection *mongo.Collection
}

func NewAuditRepository(db *mongo.Database) AuditRepository {
	return &auditRepo{
		collection: db.Collection("audit_logs"),
	}
}

func (r *auditRepo) Create(ctx context.Context, audit *models.AuditLog) error {
	if audit.ID.IsZero() {
		audit.ID = primitive.NewObjectID()
	}
	audit.CreatedAt = time.Now()
	_, err := r.collection.InsertOne(ctx, audit)
	return err
}

func (r *auditRepo) GetByEntity(ctx context.Context, entityType string, entityID primitive.ObjectID) ([]models.AuditLog, error) {
	filter := bson.M{"entity_type": entityType, "entity_id": entityID}
	findOpts := options.Find().SetSort(bson.D{{Key: "created_at", Value: -1}})
	cursor, err := r.collection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var audits []models.AuditLog
	if err := cursor.All(ctx, &audits); err != nil {
		return nil, err
	}

	return audits, nil
}

func (r *auditRepo) GetByUser(ctx context.Context, userID primitive.ObjectID, page, pageSize int) ([]models.AuditLog, int64, error) {
	filter := bson.M{"user_id": userID}
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

	var audits []models.AuditLog
	if err := cursor.All(ctx, &audits); err != nil {
		return nil, 0, err
	}

	return audits, total, nil
}
// GetAll retrieves all audit logs from the database
func (r *auditRepo) GetAll(ctx context.Context) ([]models.AuditLog, error) {
	// Empty bson.M{} means "find everything"
	cursor, err := r.collection.Find(ctx, bson.M{})
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	var logs []models.AuditLog
	if err = cursor.All(ctx, &logs); err != nil {
		return nil, err
	}

	return logs, nil
}
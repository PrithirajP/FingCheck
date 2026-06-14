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

type UserRepository interface {
	Create(ctx context.Context, user *models.User) error
	GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error)
	GetByClerkID(ctx context.Context, clerkID string) (*models.User, error)
	GetByEmail(ctx context.Context, email string) (*models.User, error)
	GetAll(ctx context.Context, page, pageSize int) ([]models.User, int64, error)
	Update(ctx context.Context, user *models.User) error
	Delete(ctx context.Context, id primitive.ObjectID) error
	HardDelete(ctx context.Context, id primitive.ObjectID) error
}

type userRepo struct {
	collection *mongo.Collection
}

func NewUserRepository(db *mongo.Database) UserRepository {
	return &userRepo{
		collection: db.Collection("users"),
	}
}

func (r *userRepo) Create(ctx context.Context, user *models.User) error {
	if user.ID.IsZero() {
		user.ID = primitive.NewObjectID()
	}
	user.CreatedAt = time.Now()
	user.UpdatedAt = time.Now()
	user.IsActive = true
	_, err := r.collection.InsertOne(ctx, user)
	return err
}

func (r *userRepo) GetByID(ctx context.Context, id primitive.ObjectID) (*models.User, error) {
	var user models.User
	filter := bson.M{"_id": id, "deleted_at": nil}
	err := r.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) GetByClerkID(ctx context.Context, clerkID string) (*models.User, error) {
	var user models.User
	filter := bson.M{"clerk_user_id": clerkID, "deleted_at": nil}
	err := r.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) GetByEmail(ctx context.Context, email string) (*models.User, error) {
	var user models.User
	filter := bson.M{"email": email, "deleted_at": nil}
	err := r.collection.FindOne(ctx, filter).Decode(&user)
	if err != nil {
		return nil, err
	}
	return &user, nil
}

func (r *userRepo) GetAll(ctx context.Context, page, pageSize int) ([]models.User, int64, error) {
	filter := bson.M{"deleted_at": nil}
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

	var users []models.User
	if err := cursor.All(ctx, &users); err != nil {
		return nil, 0, err
	}

	return users, total, nil
}

func (r *userRepo) Update(ctx context.Context, user *models.User) error {
	user.UpdatedAt = time.Now()
	filter := bson.M{"_id": user.ID}
	update := bson.M{"$set": user}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *userRepo) Delete(ctx context.Context, id primitive.ObjectID) error {
	now := time.Now()
	filter := bson.M{"_id": id}
	update := bson.M{"$set": bson.M{"deleted_at": now, "updated_at": now}}
	_, err := r.collection.UpdateOne(ctx, filter, update)
	return err
}

func (r *userRepo) HardDelete(ctx context.Context, id primitive.ObjectID) error {
	filter := bson.M{"_id": id}
	_, err := r.collection.DeleteOne(ctx, filter)
	return err
}

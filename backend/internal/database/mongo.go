package database

import (
	"context"
	"log"
	"time"

	"github.com/kirantiwari/fingcheck/internal/config"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

// Connect connects to MongoDB using the config and returns a *mongo.Database.
func Connect(cfg *config.Config) (*mongo.Database, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	clientOpts := options.Client().ApplyURI(cfg.MongoURL)
	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return nil, err
	}

	// Ping the database to verify connection
	err = client.Ping(ctx, nil)
	if err != nil {
		return nil, err
	}

	db := client.Database(cfg.DBName)
	log.Printf("Connected to MongoDB database: %s", cfg.DBName)

	// Ensure indexes are set up
	if err := createIndexes(ctx, db); err != nil {
		log.Printf("Warning: failed to create database indexes: %v", err)
	}

	return db, nil
}

func createIndexes(ctx context.Context, db *mongo.Database) error {
	// Indexes for Users collection
	usersCol := db.Collection("users")
	_, err := usersCol.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys:    bson.D{{Key: "clerk_user_id", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
		{
			Keys:    bson.D{{Key: "email", Value: 1}},
			Options: options.Index().SetUnique(true),
		},
	})
	if err != nil {
		return err
	}

	// Indexes for Fingerprints collection
	fpCol := db.Collection("fingerprints")
	_, err = fpCol.Indexes().CreateMany(ctx, []mongo.IndexModel{
		{
			Keys: bson.D{{Key: "uploaded_by", Value: 1}},
		},
		{
			Keys: bson.D{{Key: "status", Value: 1}},
		},
	})
	return err
}

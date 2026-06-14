.PHONY: build run tidy clean test

build:
	go build -o bin/fingcheck cmd/api/main.go

run:
	go run cmd/api/main.go

tidy:
	go mod tidy

clean:
	rm -rf bin/

test:
	go test ./...

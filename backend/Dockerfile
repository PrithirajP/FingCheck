# Build stage
FROM golang:1.24-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git gcc musl-dev

COPY go.mod go.sum ./
RUN go mod download

COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o fingcheck cmd/api/main.go

# Lightweight runtime stage
FROM alpine:latest

WORKDIR /app
RUN apk add --no-cache ca-certificates tzdata

COPY --from=builder /app/fingcheck .

# Ensure upload directories exist
RUN mkdir -p uploads/fingerprints uploads/overlaps

EXPOSE 8080

CMD ["./fingcheck"]

# ─────────────────────────────────────────────────────────────────────────────
# Stage 1: Build the Go binary
# ─────────────────────────────────────────────────────────────────────────────
FROM golang:1.22-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache git

# Download dependencies first (layer caching)
COPY go.mod go.sum ./
RUN go mod download

# Copy source and build
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-w -s" -o /bin/server ./cmd/server

# ─────────────────────────────────────────────────────────────────────────────
# Stage 2: Minimal production image
# ─────────────────────────────────────────────────────────────────────────────
FROM alpine:3.19

WORKDIR /app

# Add CA certificates for HTTPS calls if needed
RUN apk add --no-cache ca-certificates tzdata

# Copy only the compiled binary
COPY --from=builder /bin/server ./server

# Copy database migrations
COPY migrations ./migrations

EXPOSE 8080

CMD ["./server"]

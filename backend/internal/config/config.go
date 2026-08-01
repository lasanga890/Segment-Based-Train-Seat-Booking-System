package config

import (
	"fmt"
	"log"
	"os"
	"strconv"
)

// Config holds all application configuration loaded from environment variables.
// All values are configurable — no hardcoded business logic.
type Config struct {
	// Server
	ServerPort  string
	Environment string

	// Database
	DBHost     string
	DBPort     string
	DBUser     string
	DBPassword string
	DBName     string
	DBSSLMode  string
	DatabaseURL string

	// Redis
	RedisHost     string
	RedisPort     string
	RedisPassword string
	RedisDB       int

	// Seat hold duration (minutes)
	SeatHoldDurationMinutes int

	// Fare calculation
	BaseRatePerStationLKR     float64
	ReservedCoachMultiplier   float64
	UnreservedCoachMultiplier float64

	// Train configuration (configurable for future fleet changes)
	TotalCoaches              int
	ReservedCoachCount        int
	UnreservedCoachCount      int
	SeatsPerReservedCoach     int
	SeatsPerUnreservedCoach   int

	// Auth
	JWTSecret      string
	JWTExpiryHours int

	// CORS
	CORSAllowedOrigins string
}

// Load reads all configuration from environment variables with sensible defaults.
func Load() *Config {
	cfg := &Config{
		ServerPort:  getEnv("SERVER_PORT", "8080"),
		Environment: getEnv("ENVIRONMENT", "development"),

		DBHost:     getEnv("DB_HOST", "localhost"),
		DBPort:     getEnv("DB_PORT", "5432"),
		DBUser:     getEnv("DB_USER", "trainbooking"),
		DBPassword: getEnv("DB_PASSWORD", "trainbooking_secret"),
		DBName:     getEnv("DB_NAME", "trainbooking_db"),
		DBSSLMode:  getEnv("DB_SSLMODE", "disable"),

		RedisHost:     getEnv("REDIS_HOST", "localhost"),
		RedisPort:     getEnv("REDIS_PORT", "6379"),
		RedisPassword: getEnv("REDIS_PASSWORD", ""),
		RedisDB:       getEnvInt("REDIS_DB", 0),

		SeatHoldDurationMinutes: getEnvInt("SEAT_HOLD_DURATION_MINUTES", 5),

		BaseRatePerStationLKR:     getEnvFloat("BASE_RATE_PER_STATION_LKR", 45.00),
		ReservedCoachMultiplier:   getEnvFloat("RESERVED_COACH_MULTIPLIER", 1.8),
		UnreservedCoachMultiplier: getEnvFloat("UNRESERVED_COACH_MULTIPLIER", 1.0),

		TotalCoaches:            getEnvInt("TOTAL_COACHES", 8),
		ReservedCoachCount:      getEnvInt("RESERVED_COACH_COUNT", 3),
		UnreservedCoachCount:    getEnvInt("UNRESERVED_COACH_COUNT", 5),
		SeatsPerReservedCoach:   getEnvInt("SEATS_PER_RESERVED_COACH", 48),
		SeatsPerUnreservedCoach: getEnvInt("SEATS_PER_UNRESERVED_COACH", 72),

		JWTSecret:      getEnv("JWT_SECRET", "change_this_secret_in_production"),
		JWTExpiryHours: getEnvInt("JWT_EXPIRY_HOURS", 24),

		CORSAllowedOrigins: getEnv("CORS_ALLOWED_ORIGINS", "http://localhost:5173"),
	}

	// Build DATABASE_URL if not explicitly set
	dbURL := getEnv("DATABASE_URL", "")
	if dbURL == "" {
		dbURL = fmt.Sprintf(
			"postgres://%s:%s@%s:%s/%s?sslmode=%s",
			cfg.DBUser, cfg.DBPassword, cfg.DBHost, cfg.DBPort, cfg.DBName, cfg.DBSSLMode,
		)
	}
	cfg.DatabaseURL = dbURL

	log.Printf("Config loaded: env=%s port=%s db=%s@%s/%s",
		cfg.Environment, cfg.ServerPort, cfg.DBUser, cfg.DBHost, cfg.DBName)

	return cfg
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	if v := os.Getenv(key); v != "" {
		if i, err := strconv.Atoi(v); err == nil {
			return i
		}
	}
	return fallback
}

func getEnvFloat(key string, fallback float64) float64 {
	if v := os.Getenv(key); v != "" {
		if f, err := strconv.ParseFloat(v, 64); err == nil {
			return f
		}
	}
	return fallback
}

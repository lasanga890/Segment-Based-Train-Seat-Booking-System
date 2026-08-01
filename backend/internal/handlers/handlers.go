package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/redis/go-redis/v9"

	"github.com/lasanga890/segment-train-booking/internal/config"
)

// Handler is the central handler struct wiring all HTTP handlers together.
type Handler struct {
	db  *pgxpool.Pool
	rdb *redis.Client
	cfg *config.Config
}

// New creates a new Handler with all dependencies injected.
func New(db *pgxpool.Pool, rdb *redis.Client, cfg *config.Config) *Handler {
	return &Handler{db: db, rdb: rdb, cfg: cfg}
}

// RegisterRoutes mounts all API routes on the given router.
func (h *Handler) RegisterRoutes(r *chi.Mux) {
	// Public API routes
	r.Route("/api/v1", func(r chi.Router) {
		// Health check
		r.Get("/health", h.HealthCheck)

		// Stations
		r.Get("/stations", h.ListStations)

		// Coaches
		r.Get("/coaches", h.ListCoaches)

		// Schedules
		r.Get("/schedules", h.ListSchedules)

		// Seat availability for a given leg
		r.Get("/seats/availability", h.GetSeatAvailability)

		// Bookings
		r.Post("/bookings/hold", h.HoldSeat)
		r.Post("/bookings/confirm", h.ConfirmBooking)
		r.Delete("/bookings/hold/{holdId}", h.ReleaseHold)
		r.Get("/bookings/{id}", h.GetBooking)

		// Admin routes (JWT protected — middleware added in Phase 3)
		r.Route("/admin", func(r chi.Router) {
			// TODO: r.Use(h.AdminAuthMiddleware)
			r.Get("/metrics", h.GetAdminMetrics)
			r.Get("/bookings", h.ListAllBookings)
		})
	})
}

// ─── Health Check ─────────────────────────────────────────────────────────────

// HealthCheck godoc
// GET /api/v1/health
// Returns server status, database, and redis connectivity.
func (h *Handler) HealthCheck(w http.ResponseWriter, r *http.Request) {
	type healthResponse struct {
		Status    string            `json:"status"`
		Timestamp time.Time         `json:"timestamp"`
		Services  map[string]string `json:"services"`
	}

	services := map[string]string{}

	// Check PostgreSQL
	if err := h.db.Ping(r.Context()); err != nil {
		services["postgres"] = "unhealthy: " + err.Error()
	} else {
		services["postgres"] = "healthy"
	}

	// Check Redis
	if _, err := h.rdb.Ping(r.Context()).Result(); err != nil {
		services["redis"] = "unhealthy: " + err.Error()
	} else {
		services["redis"] = "healthy"
	}

	status := "ok"
	httpStatus := http.StatusOK
	for _, v := range services {
		if v != "healthy" {
			status = "degraded"
			httpStatus = http.StatusServiceUnavailable
			break
		}
	}

	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(httpStatus)
	json.NewEncoder(w).Encode(healthResponse{
		Status:    status,
		Timestamp: time.Now().UTC(),
		Services:  services,
	})
}


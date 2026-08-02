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
		r.Get("/schedules/{scheduleId}/coaches", h.ListScheduleCoaches)

		// Seat availability for a given leg
		r.Get("/seats/availability", h.GetSeatAvailability)

		// Auth routes
		r.Post("/auth/admin/login", h.AdminLogin)
		r.Post("/auth/user/register", h.UserRegister)
		r.Post("/auth/user/login", h.UserLogin)
		r.With(h.UserAuthMiddleware).Get("/auth/user/me", h.GetUserMe)

		// Bookings
		r.With(h.UserAuthMiddleware).Post("/bookings/hold", h.HoldSeat)
		r.With(h.UserAuthMiddleware).Post("/bookings/hold-many", h.HoldManySeats)
		r.With(h.UserAuthMiddleware).Post("/bookings/confirm", h.ConfirmBooking)
		r.Delete("/bookings/hold/{holdId}", h.ReleaseHold)
		r.Get("/bookings/{id}", h.GetBooking)

		// Passenger Profile & Dashboard Routes
		r.Route("/user", func(r chi.Router) {
			r.Use(h.UserAuthMiddleware)
			r.Get("/profile", h.GetUserProfile)
			r.Put("/profile", h.UpdateUserProfile)

			r.Get("/frequent-passengers", h.ListFrequentPassengers)
			r.Post("/frequent-passengers", h.AddFrequentPassenger)
			r.Delete("/frequent-passengers/{id}", h.DeleteFrequentPassenger)

			r.Get("/favorite-routes", h.ListFavoriteRoutes)
			r.Post("/favorite-routes", h.AddFavoriteRoute)
			r.Delete("/favorite-routes/{id}", h.DeleteFavoriteRoute)

			r.Get("/bookings", h.GetUserBookings)
			r.Patch("/bookings/{id}/cancel", h.CancelUserBooking)

			r.Get("/waitlists", h.GetUserWaitlists)

			r.Get("/notifications", h.GetUserNotifications)
			r.Patch("/notifications/{id}/read", h.MarkNotificationRead)
		})

		// Waitlist Join
		r.With(h.UserAuthMiddleware).Post("/waitlists/join", h.JoinWaitlist)

		// Admin routes (JWT protected)
		r.Route("/admin", func(r chi.Router) {
			r.Use(h.AdminAuthMiddleware)
			r.Get("/metrics", h.GetAdminMetrics)
			r.Get("/bookings", h.ListAllBookings)
			// Stations admin
			r.Post("/stations", h.CreateStation)
			r.Put("/stations/{id}", h.UpdateStation)
			r.Patch("/stations/{id}/status", h.ToggleStationStatus)

			// Trains admin
			r.Get("/trains", h.ListTrains)
			r.Post("/trains", h.CreateTrain)
			r.Put("/trains/{id}", h.UpdateTrain)
			r.Delete("/trains/{id}", h.DeleteTrain)

			// Coaches admin
			r.Get("/trains/{trainId}/coaches", h.ListTrainCoaches)
			r.Post("/trains/{trainId}/coaches", h.AddCoachToTrain)
			r.Put("/coaches/{id}", h.UpdateCoach)
			r.Delete("/coaches/{id}", h.RemoveCoach)

			// Schedules admin
			r.Get("/schedules", h.ListAdminSchedules)
			r.Post("/schedules", h.CreateSchedule)
			r.Put("/schedules/{id}", h.UpdateSchedule)
			r.Patch("/schedules/{id}/status", h.ToggleScheduleStatus)

			// Booking operations
			r.Patch("/bookings/{id}/cancel", h.CancelBooking)
			r.Get("/seats/{seatId}/occupancy", h.GetSeatOccupancy)

			// Analytics
			r.Get("/analytics/segments", h.GetSegmentAnalytics)
			r.Get("/analytics/revenue", h.GetRevenueAnalytics)
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

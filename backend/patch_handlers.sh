sed -i '/r\.Get("\/bookings", h\.ListAllBookings)/a \
			// Stations admin\
			r.Post("/stations", h.CreateStation)\
			r.Put("/stations/{id}", h.UpdateStation)\
			r.Patch("/stations/{id}/status", h.ToggleStationStatus)\
\
			// Trains admin\
			r.Post("/trains", h.CreateTrain)\
			r.Put("/trains/{id}", h.UpdateTrain)\
			r.Delete("/trains/{id}", h.DeleteTrain)\
\
			// Coaches admin\
			r.Get("/trains/{trainId}/coaches", h.ListTrainCoaches)\
			r.Post("/trains/{trainId}/coaches", h.AddCoachToTrain)\
			r.Put("/coaches/{id}", h.UpdateCoach)\
			r.Delete("/coaches/{id}", h.RemoveCoach)\
\
			// Schedules admin\
			r.Post("/schedules", h.CreateSchedule)\
			r.Put("/schedules/{id}", h.UpdateSchedule)\
			r.Patch("/schedules/{id}/cancel", h.CancelSchedule)\
\
			// Booking operations\
			r.Patch("/bookings/{id}/cancel", h.CancelBooking)\
			r.Get("/seats/{seatId}/occupancy", h.GetSeatOccupancy)\
\
			// Analytics\
			r.Get("/analytics/segments", h.GetSegmentAnalytics)\
			r.Get("/analytics/revenue", h.GetRevenueAnalytics)' internal/handlers/handlers.go

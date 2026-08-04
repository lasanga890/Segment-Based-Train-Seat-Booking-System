-- Migration: add refund_requests and reschedule_requests tables

CREATE TABLE refund_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  refundable_amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  admin_note TEXT,
  decided_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE reschedule_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  requested_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  new_schedule_id UUID NULL REFERENCES schedules(id),
  new_start_station_id UUID NULL REFERENCES stations(id),
  new_end_station_id UUID NULL REFERENCES stations(id),
  new_seat_id UUID NULL REFERENCES seats(id),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  admin_note TEXT,
  decided_at TIMESTAMP WITH TIME ZONE
);

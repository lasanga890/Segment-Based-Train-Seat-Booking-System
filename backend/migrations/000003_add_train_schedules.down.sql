-- Revert index
DROP INDEX IF EXISTS idx_bookings_seat_schedule_seq;

-- Remove schedule_id from bookings
ALTER TABLE bookings DROP COLUMN IF EXISTS schedule_id;

-- Drop tables
DROP TABLE IF EXISTS schedules;
DROP TABLE IF EXISTS trains;

-- Recreate old index
CREATE INDEX idx_bookings_seat_seq
    ON bookings (seat_id, start_seq, end_seq)
    WHERE status IN ('HOLD', 'CONFIRMED');

-- Create trains table
CREATE TABLE trains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_number VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    direction VARCHAR(10) NOT NULL CHECK (direction IN ('UP', 'DOWN')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create schedules table
CREATE TABLE schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    train_id UUID NOT NULL REFERENCES trains(id) ON DELETE CASCADE,
    departure_date DATE NOT NULL,
    departure_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(train_id, departure_date)
);

-- Wipe existing bookings as they lack schedule_id
TRUNCATE TABLE bookings CASCADE;

-- Modify bookings table to link to schedule
ALTER TABLE bookings ADD COLUMN schedule_id UUID NOT NULL REFERENCES schedules(id);

-- Update the index to include schedule_id for faster overlap queries
DROP INDEX IF EXISTS idx_bookings_seat_seq;
CREATE INDEX idx_bookings_seat_schedule_seq
    ON bookings (seat_id, schedule_id, start_seq, end_seq)
    WHERE status IN ('HOLD', 'CONFIRMED');

-- Seed Trains
INSERT INTO trains (id, train_number, name, direction) VALUES
    ('11111111-1111-1111-1111-111111111111', '1015', 'Udarata Menike', 'UP'),    -- Colombo to Badulla
    ('22222222-2222-2222-2222-222222222222', '1005', 'Podi Menike', 'UP'),       -- Colombo to Badulla
    ('33333333-3333-3333-3333-333333333333', '1016', 'Udarata Menike', 'DOWN'),  -- Badulla to Colombo
    ('44444444-4444-4444-4444-444444444444', '1006', 'Podi Menike', 'DOWN');     -- Badulla to Colombo

-- Seed Schedules for Today and Tomorrow (dynamic using CURRENT_DATE)
INSERT INTO schedules (id, train_id, departure_date, departure_time) VALUES
    ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', CURRENT_DATE, '08:30:00'),
    ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', CURRENT_DATE, '05:55:00'),
    ('cccccccc-cccc-cccc-cccc-cccccccccccc', '33333333-3333-3333-3333-333333333333', CURRENT_DATE, '05:45:00'),
    ('dddddddd-dddd-dddd-dddd-dddddddddddd', '44444444-4444-4444-4444-444444444444', CURRENT_DATE, '08:45:00'),
    ('eeeeeeee-eeee-eeee-eeee-eeeeeeeeeeee', '11111111-1111-1111-1111-111111111111', CURRENT_DATE + INTERVAL '1 day', '08:30:00'),
    ('ffffffff-ffff-ffff-ffff-ffffffffffff', '22222222-2222-2222-2222-222222222222', CURRENT_DATE + INTERVAL '1 day', '05:55:00'),
    ('10101010-1010-1010-1010-101010101010', '33333333-3333-3333-3333-333333333333', CURRENT_DATE + INTERVAL '1 day', '05:45:00'),
    ('20202020-2020-2020-2020-202020202020', '44444444-4444-4444-4444-444444444444', CURRENT_DATE + INTERVAL '1 day', '08:45:00');

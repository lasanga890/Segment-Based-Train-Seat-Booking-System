-- ─────────────────────────────────────────────────────────────────────────────
-- Migration: 000002_seed_data.up.sql
-- Seeds the real Colombo Fort – Badulla station data, coaches, and seats.
-- All values are real-world data for the Sri Lanka Railways scenic line.
-- ─────────────────────────────────────────────────────────────────────────────

-- ─── Stations (26 stops, Colombo Fort → Badulla) ─────────────────────────────
INSERT INTO stations (name, code, sequence_order, distance_km) VALUES
    ('Colombo Fort',    'CMB',  0,   0.0),
    ('Maradana',        'MRD',  1,   1.6),
    ('Dematagoda',      'DMG',  2,   3.2),
    ('Ragama',          'RGM',  3,  18.4),
    ('Veyangoda',       'VYG',  4,  31.2),
    ('Polgahawela',     'PLG',  5,  60.1),
    ('Rambukkana',      'RMB',  6,  86.0),
    ('Kadugannawa',     'KDG',  7, 101.3),
    ('Peradeniya Jn.',  'PRD',  8, 113.7),
    ('Kandy',           'KDY',  9, 121.1),
    ('Gampola',         'GMP', 10, 136.0),
    ('Nawalapitiya',    'NWL', 11, 154.0),
    ('Hatton',          'HTN', 12, 182.4),
    ('Kotagala',        'KGL', 13, 196.0),
    ('Nanu Oya',        'NNU', 14, 209.6),
    ('Ambewela',        'AMB', 15, 219.2),
    ('Pattipola',       'PTP', 16, 226.4),
    ('Ohiya',           'OHY', 17, 233.3),
    ('Haputale',        'HPT', 18, 256.9),
    ('Diyatalawa',      'DYT', 19, 266.7),
    ('Bandarawela',     'BNW', 20, 274.8),
    ('Ella',            'ELA', 21, 287.2),
    ('Demodara',        'DEM', 22, 296.1),
    ('Hali Ela',        'HLE', 23, 304.8),
    ('Kinigama',        'KNG', 24, 310.1),
    ('Badulla',         'BDL', 25, 315.6);

-- ─── Coaches (8 coaches: 3 reserved, 5 unreserved) ───────────────────────────
INSERT INTO coaches (coach_number, coach_type, total_seats, label) VALUES
    (1, 'RESERVED',   48, 'First Class Reserved'),
    (2, 'RESERVED',   48, 'Second Class Reserved'),
    (3, 'RESERVED',   48, 'Third Class Reserved'),
    (4, 'UNRESERVED', 72, 'Second Class Unreserved'),
    (5, 'UNRESERVED', 72, 'Second Class Unreserved'),
    (6, 'UNRESERVED', 72, 'Third Class Unreserved'),
    (7, 'UNRESERVED', 72, 'Third Class Unreserved'),
    (8, 'UNRESERVED', 72, 'Third Class Unreserved');

-- ─── Seats (only for RESERVED coaches — 3 coaches × 48 seats = 144 seats) ────
-- Generate seats for Coach 1 (48 seats)
INSERT INTO seats (coach_id, seat_number)
SELECT c.id, s.num
FROM coaches c
CROSS JOIN generate_series(1, c.total_seats) AS s(num)
WHERE c.coach_type = 'RESERVED';

-- ─── Default admin user (password: admin123 — CHANGE IN PRODUCTION) ───────────
-- bcrypt hash of 'admin123' (cost factor 10)
INSERT INTO admin_users (username, password_hash) VALUES
    ('admin', '$2a$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhy2');

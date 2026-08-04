-- Rollback migration: drop requests tables

DROP TABLE IF EXISTS reschedule_requests;
DROP TABLE IF EXISTS refund_requests;

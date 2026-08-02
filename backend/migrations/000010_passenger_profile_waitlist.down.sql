DROP INDEX IF EXISTS idx_notifications_user_unread;
DROP INDEX IF EXISTS idx_waitlists_schedule_status;
DROP INDEX IF EXISTS idx_favorite_routes_user;
DROP INDEX IF EXISTS idx_frequent_passengers_user;

DROP TABLE IF EXISTS user_notifications;
DROP TABLE IF EXISTS waitlists;
DROP TABLE IF EXISTS user_favorite_routes;
DROP TABLE IF EXISTS user_frequent_passengers;
ALTER TABLE users DROP COLUMN IF EXISTS nic_passport;

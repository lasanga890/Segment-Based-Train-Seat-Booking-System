-- Existing databases have already applied 000002, so changes to that seed file
-- are not replayed. Keep the development default admin in sync on upgrade.
INSERT INTO admin_users (username, password_hash)
VALUES ('admin', '$2a$12$pKXoAecOmMOreh.gUIiYWuhdX1e6TKQC9UzQePPKXS7W/07d9nuTe')
ON CONFLICT (username) DO UPDATE
SET password_hash = EXCLUDED.password_hash;

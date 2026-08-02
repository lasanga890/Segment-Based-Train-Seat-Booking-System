package auth

import "testing"

func TestDefaultAdminPasswordHash(t *testing.T) {
	const defaultAdminHash = "$2a$12$pKXoAecOmMOreh.gUIiYWuhdX1e6TKQC9UzQePPKXS7W/07d9nuTe"

	if !CheckPasswordHash("admin123", defaultAdminHash) {
		t.Fatal("default admin hash must authenticate the documented admin123 password")
	}
}

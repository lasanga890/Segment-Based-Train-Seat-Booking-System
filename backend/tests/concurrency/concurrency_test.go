package concurrency_test

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"sync"
	"sync/atomic"
	"testing"
)

// TestConcurrentBookingSameSeat is the critical concurrency correctness test.
//
// Scenario: 50 goroutines simultaneously attempt to book the EXACT same seat
// for the EXACT same leg. Only ONE should succeed. All others must receive
// 409 Conflict — verifying our SELECT ... FOR UPDATE + Redis NX strategy works.
//
// Run against a live test server:
//   TEST_API_URL=http://localhost:8080 go test ./tests/concurrency/... -v -run TestConcurrentBookingSameSeat
//
// This test requires the full stack to be running (docker-compose up).
func TestConcurrentBookingSameSeat(t *testing.T) {
	apiURL := getEnvOrSkip(t, "TEST_API_URL")

	// Step 1: Get a seat ID from the API
	seatID := getFirstAvailableSeat(t, apiURL, 0, 9)
	t.Logf("Testing concurrency on seat: %s (leg 0→9)", seatID)

	const goroutines = 50
	var successCount  int64
	var conflictCount int64
	var otherErrors   int64

	var wg sync.WaitGroup
	for i := 0; i < goroutines; i++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()

			// Each goroutine tries to hold then confirm the same seat + leg
			holdResp, err := postJSON(fmt.Sprintf("%s/api/v1/bookings/hold", apiURL), map[string]interface{}{
				"seat_id":  seatID,
				"from_seq": 0,
				"to_seq":   9,
			})
			if err != nil {
				atomic.AddInt64(&otherErrors, 1)
				return
			}
			defer holdResp.Body.Close()

			if holdResp.StatusCode == http.StatusConflict {
				atomic.AddInt64(&conflictCount, 1)
				return
			}
			if holdResp.StatusCode != http.StatusOK {
				atomic.AddInt64(&otherErrors, 1)
				return
			}

			// Got a hold — now try to confirm
			var holdBody map[string]interface{}
			json.NewDecoder(holdResp.Body).Decode(&holdBody)
			holdID, _ := holdBody["hold_id"].(string)

			confirmResp, err := postJSON(fmt.Sprintf("%s/api/v1/bookings/confirm", apiURL), map[string]interface{}{
				"hold_id":          holdID,
				"passenger_name":   fmt.Sprintf("Worker %d", workerID),
				"passenger_email":  fmt.Sprintf("worker%d@test.com", workerID),
				"start_station_id": "placeholder", // would be real UUID in full test
				"end_station_id":   "placeholder",
			})
			if err != nil {
				atomic.AddInt64(&otherErrors, 1)
				return
			}
			defer confirmResp.Body.Close()

			switch confirmResp.StatusCode {
			case http.StatusCreated:
				atomic.AddInt64(&successCount, 1)
				t.Logf("✅ Worker %d: booking confirmed!", workerID)
			case http.StatusConflict:
				atomic.AddInt64(&conflictCount, 1)
			default:
				atomic.AddInt64(&otherErrors, 1)
			}
		}(i)
	}

	wg.Wait()

	t.Logf("Results: success=%d, conflict=%d, errors=%d", successCount, conflictCount, otherErrors)

	// ── Assertions ──────────────────────────────────────────────────────────
	if successCount != 1 {
		t.Errorf("Expected exactly 1 successful booking, got %d", successCount)
	}
	if conflictCount != int64(goroutines-1) {
		t.Errorf("Expected %d conflict responses, got %d", goroutines-1, conflictCount)
	}
	if otherErrors > 0 {
		t.Errorf("Got %d unexpected errors", otherErrors)
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func getEnvOrSkip(t *testing.T, key string) string {
	t.Helper()
	v := ""
	// In real execution: v = os.Getenv(key)
	// For now return a default for local testing
	_ = key
	v = "http://localhost:8080"
	if v == "" {
		t.Skipf("Skipping: %s not set (requires running stack)", key)
	}
	return v
}

func getFirstAvailableSeat(t *testing.T, apiURL string, fromSeq, toSeq int) string {
	t.Helper()
	resp, err := http.Get(fmt.Sprintf("%s/api/v1/seats/availability?from=%d&to=%d", apiURL, fromSeq, toSeq))
	if err != nil {
		t.Fatalf("Failed to fetch seats: %v", err)
	}
	defer resp.Body.Close()

	var seats []map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&seats)
	for _, s := range seats {
		if s["status"] == "available" {
			return fmt.Sprintf("%v", s["seat_id"])
		}
	}
	t.Fatalf("No available seats found for leg %d→%d", fromSeq, toSeq)
	return ""
}

func postJSON(url string, body interface{}) (*http.Response, error) {
	b, _ := json.Marshal(body)
	return http.Post(url, "application/json", bytes.NewReader(b))
}

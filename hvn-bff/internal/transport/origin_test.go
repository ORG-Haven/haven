package transport

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCheckOrigin(t *testing.T) {
	ok := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(http.StatusOK) })
	h := CheckOrigin([]string{"https://app.haven.dev"})(ok)

	tests := []struct {
		name, method, origin string
		want                 int
	}{
		{"allowed origin POST", http.MethodPost, "https://app.haven.dev", http.StatusOK},
		{"foreign origin POST", http.MethodPost, "https://evil.example", http.StatusForbidden},
		{"foreign origin DELETE", http.MethodDelete, "https://evil.example", http.StatusForbidden},
		{"no origin POST (CLI)", http.MethodPost, "", http.StatusOK},
		{"foreign origin GET", http.MethodGet, "https://evil.example", http.StatusOK},
		{"lookalike origin", http.MethodPost, "https://app.haven.dev.evil.example", http.StatusForbidden},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(tt.method, "/auth/signin", nil)
			if tt.origin != "" {
				req.Header.Set("Origin", tt.origin)
			}
			rec := httptest.NewRecorder()
			h.ServeHTTP(rec, req)
			if rec.Code != tt.want {
				t.Errorf("status = %d, want %d", rec.Code, tt.want)
			}
		})
	}
}

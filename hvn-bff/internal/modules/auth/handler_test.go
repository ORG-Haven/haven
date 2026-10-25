package auth

import (
	"encoding/json"
	"errors"
	"hvnBff/internal/modules/users"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestSignUpHandler(t *testing.T) {
	tests := []struct {
		name       string
		body       string
		storeErr   error
		wantStatus int
	}{
		{name: "created", body: `{"name":"Ada","email":"ada@example.com","password":"harbor123"}`, wantStatus: http.StatusCreated},
		{name: "bad json", body: `{"name":`, wantStatus: http.StatusBadRequest},
		{name: "invalid email", body: `{"name":"Ada","email":"nope","password":"harbor123"}`, wantStatus: http.StatusBadRequest},
		{name: "email taken", body: `{"name":"Ada","email":"ada@example.com","password":"harbor123"}`, storeErr: users.ErrEmailTaken, wantStatus: http.StatusConflict},
		{name: "database failure", body: `{"name":"Ada","email":"ada@example.com","password":"harbor123"}`, storeErr: errors.New("boom"), wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(NewService(&fakeStore{err: tt.storeErr}))
			rec := httptest.NewRecorder()
			h.SignUp(rec, httptest.NewRequest(http.MethodPost, "/auth/signup", strings.NewReader(tt.body)))

			if rec.Code != tt.wantStatus {
				t.Fatalf("status = %d, want %d (body %s)", rec.Code, tt.wantStatus, rec.Body)
			}
			var body map[string]any
			if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
				t.Fatalf("body is not JSON: %s", rec.Body)
			}
			if tt.wantStatus == http.StatusCreated {
				if body["email"] != "ada@example.com" || body["id"] == "" || body["password"] != nil {
					t.Errorf("unexpected body %v", body)
				}
			} else if body["message"] == "" || body["message"] == nil {
				t.Errorf("error body has no message: %v", body)
			}
		})
	}
}

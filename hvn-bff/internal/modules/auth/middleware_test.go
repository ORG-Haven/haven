package auth

import (
	"context"
	"encoding/json"
	"errors"
	"hvnBff/internal/modules/users"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
)

// brokenSessions stands in for a database that is down.
type brokenSessions struct{ *fakeSessions }

func (brokenSessions) UserByToken(context.Context, string) (users.User, error) {
	return users.User{}, errors.New("connection refused")
}

func TestRequireSession(t *testing.T) {
	svc, _, _ := signedUpService(t)
	h := NewHandler(svc, CookieConfig{Secure: true}, testLimiter())

	rec := httptest.NewRecorder()
	h.SignIn(rec, httptest.NewRequest(http.MethodPost, "/auth/signin", strings.NewReader(`{"email":"ada@example.com","password":"harbor123"}`)))
	token := sessionCookie(t, rec).Value

	var reached bool
	var seen UserCreateResp
	protected := h.RequireSession(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		reached = true
		seen, _ = UserFrom(r.Context())
		w.WriteHeader(http.StatusOK)
	}))

	tests := []struct {
		name        string
		auth        func(*http.Request)
		wantStatus  int
		wantReached bool
		wantCleared bool
	}{
		{name: "cookie", auth: func(r *http.Request) { r.AddCookie(&http.Cookie{Name: secureCookieName, Value: token}) }, wantStatus: http.StatusOK, wantReached: true},
		{name: "bearer token", auth: func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+token) }, wantStatus: http.StatusOK, wantReached: true},
		{name: "no credentials", wantStatus: http.StatusUnauthorized},
		{name: "stale cookie", auth: func(r *http.Request) { r.AddCookie(&http.Cookie{Name: secureCookieName, Value: "forged"}) }, wantStatus: http.StatusUnauthorized, wantCleared: true},
		{name: "unknown bearer token", auth: func(r *http.Request) { r.Header.Set("Authorization", "Bearer forged") }, wantStatus: http.StatusUnauthorized},
		{name: "malformed authorization", auth: func(r *http.Request) { r.Header.Set("Authorization", "Basic "+token) }, wantStatus: http.StatusUnauthorized},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			reached, seen = false, UserCreateResp{}
			req := httptest.NewRequest(http.MethodGet, "/projects", nil)
			if tt.auth != nil {
				tt.auth(req)
			}
			rec := httptest.NewRecorder()
			protected.ServeHTTP(rec, req)

			if rec.Code != tt.wantStatus || reached != tt.wantReached {
				t.Fatalf("status %d reached %v, want %d reached %v", rec.Code, reached, tt.wantStatus, tt.wantReached)
			}
			if tt.wantReached && seen.Email != "ada@example.com" {
				t.Errorf("handler saw user %+v", seen)
			}
			if !tt.wantReached {
				var body map[string]string
				if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil || body["message"] == "" {
					t.Errorf("401 body = %s", rec.Body)
				}
			}
			cleared := false
			for _, ck := range rec.Result().Cookies() {
				cleared = cleared || (ck.Name == secureCookieName && ck.MaxAge < 0)
			}
			if cleared != tt.wantCleared {
				t.Errorf("cookie cleared = %v, want %v", cleared, tt.wantCleared)
			}
		})
	}
}

func TestRequireSessionDatabaseDown(t *testing.T) {
	h := NewHandler(NewService(&fakeStore{}, brokenSessions{newFakeSessions()}), CookieConfig{Secure: true}, testLimiter())
	reached := false
	protected := h.RequireSession(http.HandlerFunc(func(http.ResponseWriter, *http.Request) { reached = true }))

	req := httptest.NewRequest(http.MethodGet, "/projects", nil)
	req.AddCookie(&http.Cookie{Name: secureCookieName, Value: "some-token"})
	rec := httptest.NewRecorder()
	protected.ServeHTTP(rec, req)

	if rec.Code != http.StatusInternalServerError || reached {
		t.Fatalf("status %d reached %v, want 500 and not reached", rec.Code, reached)
	}
	if len(rec.Result().Cookies()) != 0 {
		t.Error("cookie cleared on a database error; the session may still be valid")
	}
}

func TestUserFromOutsideMiddleware(t *testing.T) {
	if _, ok := UserFrom(context.Background()); ok {
		t.Error("UserFrom reported a user on a bare context")
	}
}

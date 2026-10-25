package server

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"hvnBff/internal/modules/auth"

	"github.com/go-chi/chi/v5"
)

// Routes that may be called without a session. Adding one here should be a deliberate choice.
var public = map[string]bool{
	"GET /healthz":       true,
	"GET /readyz":        true,
	"POST /auth/signup":  true,
	"POST /auth/signin":  true,
	"POST /auth/signout": true,
}

// TestEveryOtherRouteNeedsASession fails when an endpoint is registered outside the protected
// group by mistake: every route not listed in public must answer 401 without credentials.
func TestEveryOtherRouteNeedsASession(t *testing.T) {
	// The stores are never reached: a request without credentials is refused before any lookup.
	h := auth.NewHandler(auth.NewService(nil, nil), auth.CookieConfig{Secure: true}, nil)
	router := NewRouter(nil, h, nil).(chi.Routes)

	var protected int
	err := chi.Walk(router, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		key := method + " " + route
		if public[key] {
			return nil
		}
		protected++
		rec := httptest.NewRecorder()
		router.(http.Handler).ServeHTTP(rec, httptest.NewRequest(method, route, nil))
		if rec.Code != http.StatusUnauthorized {
			t.Errorf("%s without a session = %d, want 401 (add it to the protected group, or to public on purpose)", key, rec.Code)
		}
		return nil
	})
	if err != nil {
		t.Fatal(err)
	}
	if protected == 0 {
		t.Error("found no protected routes; did the walk run?")
	}
}

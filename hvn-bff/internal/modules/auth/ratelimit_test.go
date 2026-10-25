package auth

import (
	"context"
	"errors"
	"fmt"
	"hvnBff/internal/transport"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"
	"time"
)

func signInAs(h *Handler, email, password, ip string) *httptest.ResponseRecorder {
	body := fmt.Sprintf(`{"email":%q,"password":%q}`, email, password)
	req := httptest.NewRequest(http.MethodPost, "/auth/signin", strings.NewReader(body))
	req.RemoteAddr = ip + ":40000"
	rec := httptest.NewRecorder()
	h.SignIn(rec, req)
	return rec
}

func TestSignInLocksAccountAfterFailures(t *testing.T) {
	svc, _, _ := signedUpService(t)
	h := NewHandler(svc, CookieConfig{Secure: true}, testLimiter())

	// Failures from different addresses still count against the account.
	for i := range signInFailuresPerEmail {
		if rec := signInAs(h, "ada@example.com", "wrong-pass1", fmt.Sprintf("198.51.100.%d", i)); rec.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d = %d, want 401", i+1, rec.Code)
		}
	}

	rec := signInAs(h, "  ADA@example.com", "harbor123", "203.0.113.9")
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("correct password on a locked account = %d, want 429", rec.Code)
	}
	if retry, _ := strconv.Atoi(rec.Header().Get("Retry-After")); retry < 60 || retry > int(signInFailureWindow.Seconds()) {
		t.Errorf("Retry-After = %q", rec.Header().Get("Retry-After"))
	}
	if len(rec.Result().Cookies()) != 0 {
		t.Error("locked sign-in set a cookie")
	}
	if !strings.Contains(rec.Body.String(), "Too many sign-in attempts") {
		t.Errorf("body = %s", rec.Body)
	}

	if rec := signInAs(h, "someone-else@example.com", "harbor123", "203.0.113.9"); rec.Code != http.StatusUnauthorized {
		t.Errorf("other account = %d, want 401 (not locked)", rec.Code)
	}
}

func TestSignInSuccessClearsFailures(t *testing.T) {
	svc, _, _ := signedUpService(t)
	h := NewHandler(svc, CookieConfig{Secure: true}, testLimiter())

	for range signInFailuresPerEmail - 1 {
		signInAs(h, "ada@example.com", "wrong-pass1", "198.51.100.1")
	}
	if rec := signInAs(h, "ada@example.com", "harbor123", "198.51.100.1"); rec.Code != http.StatusOK {
		t.Fatalf("sign-in = %d, want 200", rec.Code)
	}
	for i := range signInFailuresPerEmail - 1 {
		if rec := signInAs(h, "ada@example.com", "wrong-pass1", "198.51.100.1"); rec.Code != http.StatusUnauthorized {
			t.Fatalf("failure %d after success = %d, want 401", i+1, rec.Code)
		}
	}
}

func TestSignInLimitsPerAddress(t *testing.T) {
	svc, _, _ := signedUpService(t)
	h := NewHandler(svc, CookieConfig{Secure: true}, testLimiter())

	// Spread over many accounts so only the address limit applies.
	for i := range signInPerIP {
		if rec := signInAs(h, fmt.Sprintf("user%d@example.com", i), "wrong-pass1", "198.51.100.7"); rec.Code != http.StatusUnauthorized {
			t.Fatalf("attempt %d = %d, want 401", i+1, rec.Code)
		}
	}
	if rec := signInAs(h, "ada@example.com", "harbor123", "198.51.100.7"); rec.Code != http.StatusTooManyRequests {
		t.Fatalf("attempt over the address limit = %d, want 429", rec.Code)
	}
	if rec := signInAs(h, "ada@example.com", "harbor123", "198.51.100.8"); rec.Code != http.StatusOK {
		t.Errorf("another address = %d, want 200", rec.Code)
	}
}

// failingCounter stands in for an unreachable database.
type failingCounter struct{}

func (failingCounter) Allow(context.Context, string) (bool, time.Duration, error) {
	return false, 0, errors.New("connection refused")
}
func (failingCounter) Blocked(context.Context, string) (bool, time.Duration, error) {
	return false, 0, errors.New("connection refused")
}
func (failingCounter) Hit(context.Context, string) error   { return errors.New("connection refused") }
func (failingCounter) Reset(context.Context, string) error { return errors.New("connection refused") }

func TestSignInWhenLimiterFails(t *testing.T) {
	svc, _, _ := signedUpService(t)
	limiter := NewAuthLimiter(func(string, int, time.Duration) RateCounter { return failingCounter{} }, transport.ClientIP(0))
	h := NewHandler(svc, CookieConfig{Secure: true}, limiter)
	if rec := signInAs(h, "ada@example.com", "harbor123", "198.51.100.1"); rec.Code != http.StatusOK {
		t.Fatalf("sign-in with a broken limiter = %d, want 200 (fail open)", rec.Code)
	}
}

func signUpAs(h *Handler, email, ip string) *httptest.ResponseRecorder {
	body := fmt.Sprintf(`{"name":"Ada","email":%q,"password":"harbor123"}`, email)
	req := httptest.NewRequest(http.MethodPost, "/auth/signup", strings.NewReader(body))
	req.RemoteAddr = ip + ":40000"
	rec := httptest.NewRecorder()
	h.SignUp(rec, req)
	return rec
}

func TestSignUpLimitsPerAddress(t *testing.T) {
	h := NewHandler(NewService(&fakeStore{}, newFakeSessions()), CookieConfig{Secure: true}, testLimiter())

	// Rejected attempts count too, so probing for taken emails uses up the allowance.
	if rec := signUpAs(h, "not-an-email", "198.51.100.7"); rec.Code != http.StatusBadRequest {
		t.Fatalf("invalid sign-up = %d, want 400", rec.Code)
	}
	for i := range signUpPerIP - 1 {
		if rec := signUpAs(h, fmt.Sprintf("user%d@example.com", i), "198.51.100.7"); rec.Code != http.StatusCreated {
			t.Fatalf("sign-up %d = %d, want 201", i+2, rec.Code)
		}
	}

	rec := signUpAs(h, "one-more@example.com", "198.51.100.7")
	if rec.Code != http.StatusTooManyRequests {
		t.Fatalf("sign-up over the limit = %d, want 429", rec.Code)
	}
	if retry, _ := strconv.Atoi(rec.Header().Get("Retry-After")); retry < 3000 || retry > int(signUpPerIPWindow.Seconds()) {
		t.Errorf("Retry-After = %q, want close to an hour", rec.Header().Get("Retry-After"))
	}
	if !strings.Contains(rec.Body.String(), "Too many sign-up attempts. Try again in an hour.") {
		t.Errorf("body = %s", rec.Body)
	}
	if len(rec.Result().Cookies()) != 0 {
		t.Error("refused sign-up set a cookie")
	}

	if rec := signUpAs(h, "one-more@example.com", "198.51.100.8"); rec.Code != http.StatusCreated {
		t.Errorf("another address = %d, want 201", rec.Code)
	}
}

func TestSignUpAndSignInCountSeparately(t *testing.T) {
	h := NewHandler(NewService(&fakeStore{}, newFakeSessions()), CookieConfig{Secure: true}, testLimiter())
	for i := range signUpPerIP {
		signUpAs(h, fmt.Sprintf("user%d@example.com", i), "198.51.100.9")
	}
	if rec := signInAs(h, "user0@example.com", "harbor123", "198.51.100.9"); rec.Code != http.StatusOK {
		t.Errorf("sign-in after using up sign-ups = %d, want 200", rec.Code)
	}
}

func TestHumanWait(t *testing.T) {
	for secs, want := range map[int]string{
		1: "a minute", 59: "a minute", 60: "a minute", 61: "2 minutes",
		900: "15 minutes", 3599: "an hour", 3600: "an hour", 5400: "2 hours",
	} {
		if got := humanWait(secs); got != want {
			t.Errorf("humanWait(%d) = %q, want %q", secs, got, want)
		}
	}
}

func TestSignUpWhenLimiterFails(t *testing.T) {
	limiter := NewAuthLimiter(func(string, int, time.Duration) RateCounter { return failingCounter{} }, transport.ClientIP(0))
	h := NewHandler(NewService(&fakeStore{}, newFakeSessions()), CookieConfig{Secure: true}, limiter)
	if rec := signUpAs(h, "ada@example.com", "198.51.100.1"); rec.Code != http.StatusCreated {
		t.Fatalf("sign-up with a broken limiter = %d, want 201 (fail open)", rec.Code)
	}
}

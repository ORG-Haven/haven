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
		{name: "created", body: `{"username":"ada","email":"ada@example.com","password":"harbor123"}`, wantStatus: http.StatusCreated},
		{name: "bad json", body: `{"username":`, wantStatus: http.StatusBadRequest},
		{name: "invalid email", body: `{"username":"ada","email":"nope","password":"harbor123"}`, wantStatus: http.StatusBadRequest},
		{name: "email taken", body: `{"username":"ada","email":"ada@example.com","password":"harbor123"}`, storeErr: users.ErrEmailTaken, wantStatus: http.StatusConflict},
		{name: "username taken", body: `{"username":"ada","email":"ada@example.com","password":"harbor123"}`, storeErr: users.ErrUsernameTaken, wantStatus: http.StatusConflict},
		{name: "invalid username", body: `{"username":"Ada Lovelace","email":"ada@example.com","password":"harbor123"}`, wantStatus: http.StatusBadRequest},
		{name: "database failure", body: `{"username":"ada","email":"ada@example.com","password":"harbor123"}`, storeErr: errors.New("boom"), wantStatus: http.StatusInternalServerError},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			h := NewHandler(NewService(&fakeStore{err: tt.storeErr}, newFakeSessions()), CookieConfig{Secure: true}, testLimiter())
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
				user, _ := body["user"].(map[string]any)
				if user["email"] != "ada@example.com" || user["id"] == "" || user["password"] != nil || body["session"] != nil {
					t.Errorf("unexpected body %v", body)
				}
				ck := sessionCookie(t, rec)
				if ck.Value == "" || !ck.HttpOnly || !ck.Secure || ck.SameSite != http.SameSiteLaxMode || ck.Path != "/" {
					t.Errorf("unexpected cookie %+v", ck)
				}
			} else if body["message"] == "" || body["message"] == nil {
				t.Errorf("error body has no message: %v", body)
			}
			if want := map[string]string{"email taken": "email_taken", "username taken": "username_taken"}[tt.name]; want != "" && body["code"] != want {
				t.Errorf("code = %v, want %s", body["code"], want)
			}
		})
	}
}

func sessionCookie(t *testing.T, rec *httptest.ResponseRecorder) *http.Cookie {
	t.Helper()
	for _, ck := range rec.Result().Cookies() {
		if ck.Name == secureCookieName {
			return ck
		}
	}
	t.Fatalf("no %s cookie in response; headers %v", secureCookieName, rec.Header())
	return nil
}

func TestSessionAndSignOutHandlers(t *testing.T) {
	svc, _, _ := signedUpService(t)
	h := NewHandler(svc, CookieConfig{Secure: true}, testLimiter())

	rec := httptest.NewRecorder()
	h.SignIn(rec, httptest.NewRequest(http.MethodPost, "/auth/signin", strings.NewReader(`{"email":"ada@example.com","password":"harbor123"}`)))
	if rec.Code != http.StatusOK {
		t.Fatalf("sign-in status = %d (%s)", rec.Code, rec.Body)
	}
	if strings.Contains(rec.Body.String(), "token") {
		t.Errorf("sign-in body leaks the token: %s", rec.Body)
	}
	token := sessionCookie(t, rec).Value

	call := func(fn http.HandlerFunc, method string, auth func(*http.Request)) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, "/", nil)
		if auth != nil {
			auth(req)
		}
		rec := httptest.NewRecorder()
		fn(rec, req)
		return rec
	}
	withCookie := func(v string) func(*http.Request) {
		return func(r *http.Request) { r.AddCookie(&http.Cookie{Name: secureCookieName, Value: v}) }
	}
	withBearer := func(v string) func(*http.Request) {
		return func(r *http.Request) { r.Header.Set("Authorization", "Bearer "+v) }
	}

	if got := call(h.RequireSession(http.HandlerFunc(h.Session)).ServeHTTP, http.MethodGet, withCookie(token)).Code; got != http.StatusOK {
		t.Errorf("session with cookie = %d, want 200", got)
	}
	if got := call(h.RequireSession(http.HandlerFunc(h.Session)).ServeHTTP, http.MethodGet, withBearer(token)).Code; got != http.StatusOK {
		t.Errorf("session with bearer token = %d, want 200", got)
	}
	if got := call(h.RequireSession(http.HandlerFunc(h.Session)).ServeHTTP, http.MethodGet, nil).Code; got != http.StatusUnauthorized {
		t.Errorf("session without credentials = %d, want 401", got)
	}

	stale := call(h.RequireSession(http.HandlerFunc(h.Session)).ServeHTTP, http.MethodGet, withCookie("forged"))
	if stale.Code != http.StatusUnauthorized {
		t.Errorf("session with stale cookie = %d, want 401", stale.Code)
	}
	if ck := sessionCookie(t, stale); ck.MaxAge >= 0 {
		t.Errorf("stale cookie not cleared: %+v", ck)
	}

	out := call(h.SignOut, http.MethodPost, withCookie(token))
	if out.Code != http.StatusNoContent {
		t.Errorf("sign-out = %d, want 204", out.Code)
	}
	if ck := sessionCookie(t, out); ck.MaxAge >= 0 {
		t.Errorf("sign-out did not clear the cookie: %+v", ck)
	}
	if got := call(h.RequireSession(http.HandlerFunc(h.Session)).ServeHTTP, http.MethodGet, withCookie(token)).Code; got != http.StatusUnauthorized {
		t.Errorf("session after sign-out = %d, want 401", got)
	}

	rec = httptest.NewRecorder()
	h.SignIn(rec, httptest.NewRequest(http.MethodPost, "/auth/signin", strings.NewReader(`{"email":"ada@example.com","password":"wrong-pass1"}`)))
	if rec.Code != http.StatusUnauthorized || len(rec.Result().Cookies()) != 0 {
		t.Errorf("wrong password = %d with cookies %v, want 401 and none", rec.Code, rec.Result().Cookies())
	}
}

func TestInsecureCookieForLocalHTTP(t *testing.T) {
	h := NewHandler(NewService(&fakeStore{}, newFakeSessions()), CookieConfig{Secure: false}, testLimiter())
	rec := httptest.NewRecorder()
	h.SignUp(rec, httptest.NewRequest(http.MethodPost, "/auth/signup", strings.NewReader(`{"username":"ada","email":"ada@example.com","password":"harbor123"}`)))
	cookies := rec.Result().Cookies()
	if len(cookies) != 1 || cookies[0].Name != insecureCookieName || cookies[0].Secure {
		t.Fatalf("cookies = %+v, want one non-Secure %s", cookies, insecureCookieName)
	}
}

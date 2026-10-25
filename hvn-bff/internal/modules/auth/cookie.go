package auth

import (
	"net/http"
	"time"
)

// CookieConfig describes the browser session cookie.
type CookieConfig struct {
	// Secure marks the cookie HTTPS-only and gives it the __Host- prefix, which makes the
	// browser refuse it on plain HTTP or with a Domain attribute. Turn off only for local HTTP.
	Secure bool
}

const (
	secureCookieName   = "__Host-haven_session"
	insecureCookieName = "haven_session"
)

func (c CookieConfig) name() string {
	if c.Secure {
		return secureCookieName
	}
	return insecureCookieName
}

func (c CookieConfig) set(w http.ResponseWriter, token string, expires time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     c.name(),
		Value:    token,
		Path:     "/",
		Expires:  expires,
		MaxAge:   int(time.Until(expires).Seconds()),
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: http.SameSiteLaxMode,
	})
}

func (c CookieConfig) clear(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     c.name(),
		Value:    "",
		Path:     "/",
		MaxAge:   -1,
		HttpOnly: true,
		Secure:   c.Secure,
		SameSite: http.SameSiteLaxMode,
	})
}

// token reads the session cookie, if the request has one.
func (c CookieConfig) token(r *http.Request) string {
	if ck, err := r.Cookie(c.name()); err == nil {
		return ck.Value
	}
	return ""
}

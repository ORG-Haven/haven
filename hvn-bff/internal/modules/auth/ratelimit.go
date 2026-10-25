package auth

import (
	"context"
	"fmt"
	"hvnBff/internal/transport"
	"log/slog"
	"math"
	"net/http"
	"strconv"
	"strings"
	"time"
)

const (
	// Attempts from one address, right or wrong. Generous enough for a shared office network.
	signInPerIP       = 20
	signInPerIPWindow = 10 * time.Minute
	// Wrong passwords for one account before it is paused, from any address.
	signInFailuresPerEmail = 5
	signInFailureWindow    = 15 * time.Minute
	// Sign-up attempts from one address, accepted or not. Slows scripted account creation and
	// probing which emails have accounts, while letting a team sign up from one office.
	signUpPerIP       = 20
	signUpPerIPWindow = time.Hour
)

// RateCounter counts events per key in fixed windows (ratelimit.Counter in production).
type RateCounter interface {
	Allow(ctx context.Context, key string) (ok bool, wait time.Duration, err error)
	Blocked(ctx context.Context, key string) (blocked bool, wait time.Duration, err error)
	Hit(ctx context.Context, key string) error
	Reset(ctx context.Context, key string) error
}

// NewCounter builds a RateCounter allowing limit events per window; scope keeps counters apart.
type NewCounter func(scope string, limit int, window time.Duration) RateCounter

// AuthLimiter throttles sign-in per client address and per account, and sign-up per address.
type AuthLimiter struct {
	signInIP    RateCounter
	signInEmail RateCounter
	signUpIP    RateCounter
	clientIP    func(*http.Request) string
}

func NewAuthLimiter(newCounter NewCounter, clientIP func(*http.Request) string) *AuthLimiter {
	return &AuthLimiter{
		signInIP:    newCounter("signin_ip", signInPerIP, signInPerIPWindow),
		signInEmail: newCounter("signin_email", signInFailuresPerEmail, signInFailureWindow),
		signUpIP:    newCounter("signup_ip", signUpPerIP, signUpPerIPWindow),
		clientIP:    clientIP,
	}
}

// beforeSignIn counts the attempt and reports how long to wait if it must be refused.
// An account that has used up its failures is refused even with the right password,
// otherwise guessing could go on until the right one turned up.
//
// If the counters can't be reached the attempt is let through: sign-in itself needs the
// same database, so an outage there fails it anyway, and a limiter fault shouldn't lock
// everyone out.
func (l *AuthLimiter) beforeSignIn(r *http.Request, email string) (refuse bool, wait time.Duration) {
	ctx := r.Context()
	ok, wait, err := l.signInIP.Allow(ctx, l.clientIP(r))
	if err != nil {
		slog.ErrorContext(ctx, "sign-in rate limit", "err", err)
	} else if !ok {
		return true, wait
	}
	blocked, wait, err := l.signInEmail.Blocked(ctx, email)
	if err != nil {
		slog.ErrorContext(ctx, "sign-in rate limit", "err", err)
		return false, 0
	}
	return blocked, wait
}

func (l *AuthLimiter) signInFailed(ctx context.Context, email string) {
	if err := l.signInEmail.Hit(ctx, email); err != nil {
		slog.ErrorContext(ctx, "record failed sign-in", "err", err)
	}
}

func (l *AuthLimiter) signInSucceeded(ctx context.Context, email string) {
	if err := l.signInEmail.Reset(ctx, email); err != nil {
		slog.ErrorContext(ctx, "clear failed sign-ins", "err", err)
	}
}

// beforeSignUp counts the attempt against the client address. Like sign-in, it lets the
// attempt through if the counter can't be reached.
func (l *AuthLimiter) beforeSignUp(r *http.Request) (refuse bool, wait time.Duration) {
	ok, wait, err := l.signUpIP.Allow(r.Context(), l.clientIP(r))
	if err != nil {
		slog.ErrorContext(r.Context(), "sign-up rate limit", "err", err)
		return false, 0
	}
	return !ok, wait
}

func limiterKey(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

// writeTooManyAttempts answers 429 with Retry-After; action is "sign-in" or "sign-up".
func writeTooManyAttempts(w http.ResponseWriter, action string, wait time.Duration) {
	secs := int(math.Ceil(wait.Seconds()))
	if secs < 1 {
		secs = 1
	}
	w.Header().Set("Retry-After", strconv.Itoa(secs))
	transport.WriteError(w, http.StatusTooManyRequests,
		fmt.Sprintf("Too many %s attempts. Try again in %s.", action, humanWait(secs)))
}

func humanWait(secs int) string {
	if secs < 60 {
		return "a minute"
	}
	mins := (secs + 59) / 60
	switch {
	case mins >= 90:
		return fmt.Sprintf("%d hours", (mins+59)/60)
	case mins >= 60:
		return "an hour"
	case mins > 1:
		return fmt.Sprintf("%d minutes", mins)
	}
	return "a minute"
}

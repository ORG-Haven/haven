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

// SignInLimiter throttles POST /auth/signin per client address and per account.
type SignInLimiter struct {
	perIP    RateCounter
	perEmail RateCounter
	clientIP func(*http.Request) string
}

func NewSignInLimiter(newCounter NewCounter, clientIP func(*http.Request) string) *SignInLimiter {
	return &SignInLimiter{
		perIP:    newCounter("signin_ip", signInPerIP, signInPerIPWindow),
		perEmail: newCounter("signin_email", signInFailuresPerEmail, signInFailureWindow),
		clientIP: clientIP,
	}
}

// before counts the attempt and reports how long to wait if it must be refused.
// An account that has used up its failures is refused even with the right password,
// otherwise guessing could go on until the right one turned up.
//
// If the counters can't be reached the attempt is let through: sign-in itself needs the
// same database, so an outage there fails it anyway, and a limiter fault shouldn't lock
// everyone out.
func (l *SignInLimiter) before(r *http.Request, email string) (refuse bool, wait time.Duration) {
	ctx := r.Context()
	ok, wait, err := l.perIP.Allow(ctx, l.clientIP(r))
	if err != nil {
		slog.ErrorContext(ctx, "sign-in rate limit", "err", err)
	} else if !ok {
		return true, wait
	}
	blocked, wait, err := l.perEmail.Blocked(ctx, email)
	if err != nil {
		slog.ErrorContext(ctx, "sign-in rate limit", "err", err)
		return false, 0
	}
	return blocked, wait
}

func (l *SignInLimiter) failed(ctx context.Context, email string) {
	if err := l.perEmail.Hit(ctx, email); err != nil {
		slog.ErrorContext(ctx, "record failed sign-in", "err", err)
	}
}

func (l *SignInLimiter) succeeded(ctx context.Context, email string) {
	if err := l.perEmail.Reset(ctx, email); err != nil {
		slog.ErrorContext(ctx, "clear failed sign-ins", "err", err)
	}
}

func limiterKey(email string) string {
	return strings.ToLower(strings.TrimSpace(email))
}

func writeTooManyAttempts(w http.ResponseWriter, wait time.Duration) {
	secs := int(math.Ceil(wait.Seconds()))
	if secs < 1 {
		secs = 1
	}
	w.Header().Set("Retry-After", strconv.Itoa(secs))
	transport.WriteError(w, http.StatusTooManyRequests,
		fmt.Sprintf("Too many sign-in attempts. Try again in %s.", humanWait(secs)))
}

func humanWait(secs int) string {
	if secs < 60 {
		return "a minute"
	}
	if mins := (secs + 59) / 60; mins > 1 {
		return fmt.Sprintf("%d minutes", mins)
	}
	return "a minute"
}

// Package ratelimit counts events per key in fixed time windows, in Postgres, so every BFF
// replica shares the same counts. Windows are timed with the database clock.
package ratelimit

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// Counter allows limit events per key in each window. Counters with different scopes
// share the rate_limits table without colliding.
type Counter struct {
	pool   *pgxpool.Pool
	scope  string
	limit  int
	window time.Duration
}

func New(pool *pgxpool.Pool, scope string, limit int, window time.Duration) *Counter {
	return &Counter{pool: pool, scope: scope, limit: limit, window: window}
}

// Counts the event, starting a new window if the key's last one has ended. One statement,
// so concurrent requests on any replica can't lose an increment.
const hitSQL = `
	INSERT INTO rate_limits (scope, key_hash, count, reset_at)
	VALUES ($1, $2, 1, now() + make_interval(secs => $3))
	ON CONFLICT (scope, key_hash) DO UPDATE SET
		count    = CASE WHEN rate_limits.reset_at <= now() THEN 1 ELSE rate_limits.count + 1 END,
		reset_at = CASE WHEN rate_limits.reset_at <= now() THEN EXCLUDED.reset_at ELSE rate_limits.reset_at END
	RETURNING count, EXTRACT(EPOCH FROM reset_at - now())::float8`

// Allow records an event for key and reports whether it is within the limit.
// When it isn't, wait is how long until the key's window resets.
func (c *Counter) Allow(ctx context.Context, key string) (ok bool, wait time.Duration, err error) {
	var count int
	var secs float64
	if err := c.pool.QueryRow(ctx, hitSQL, c.scope, hashKey(key), c.window.Seconds()).Scan(&count, &secs); err != nil {
		return false, 0, fmt.Errorf("rate limit %s: %w", c.scope, err)
	}
	if count > c.limit {
		return false, seconds(secs), nil
	}
	return true, 0, nil
}

// Blocked reports whether key has used up its window, without recording an event.
func (c *Counter) Blocked(ctx context.Context, key string) (blocked bool, wait time.Duration, err error) {
	var count int
	var secs float64
	err = c.pool.QueryRow(ctx, `
		SELECT count, EXTRACT(EPOCH FROM reset_at - now())::float8
		FROM rate_limits WHERE scope = $1 AND key_hash = $2 AND reset_at > now()`,
		c.scope, hashKey(key),
	).Scan(&count, &secs)
	if errors.Is(err, pgx.ErrNoRows) {
		return false, 0, nil
	}
	if err != nil {
		return false, 0, fmt.Errorf("rate limit %s: %w", c.scope, err)
	}
	if count >= c.limit {
		return true, seconds(secs), nil
	}
	return false, 0, nil
}

// Hit records an event for key without checking the limit.
func (c *Counter) Hit(ctx context.Context, key string) error {
	_, _, err := c.Allow(ctx, key)
	return err
}

// Reset forgets key's events.
func (c *Counter) Reset(ctx context.Context, key string) error {
	if _, err := c.pool.Exec(ctx, "DELETE FROM rate_limits WHERE scope = $1 AND key_hash = $2", c.scope, hashKey(key)); err != nil {
		return fmt.Errorf("rate limit %s: %w", c.scope, err)
	}
	return nil
}

// DeleteExpired removes finished windows for every scope and reports how many went.
// Counting already ignores them; this only keeps the table small.
func DeleteExpired(ctx context.Context, pool *pgxpool.Pool) (int64, error) {
	tag, err := pool.Exec(ctx, "DELETE FROM rate_limits WHERE reset_at <= now()")
	if err != nil {
		return 0, fmt.Errorf("delete expired rate limits: %w", err)
	}
	return tag.RowsAffected(), nil
}

func hashKey(key string) string {
	sum := sha256.Sum256([]byte(key))
	return hex.EncodeToString(sum[:])
}

func seconds(s float64) time.Duration {
	return time.Duration(s * float64(time.Second))
}

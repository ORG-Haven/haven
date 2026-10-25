package ratelimit

import (
	"context"
	"fmt"
	"os"
	"sync"
	"testing"
	"time"

	"hvnBff/internal/db"

	"github.com/jackc/pgx/v5/pgxpool"
)

// These run against a real Postgres when TEST_DATABASE_URL is set, for example
// TEST_DATABASE_URL=postgres://haven:haven@localhost:5432/haven?sslmode=disable go test ./...
func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	url := os.Getenv("TEST_DATABASE_URL")
	if url == "" {
		t.Skip("TEST_DATABASE_URL not set")
	}
	ctx := context.Background()
	pool, err := db.Connect(ctx, url)
	if err != nil {
		t.Fatal(err)
	}
	if err := db.Migrate(ctx, pool); err != nil {
		t.Fatal(err)
	}
	t.Cleanup(pool.Close)
	return pool
}

// testScope gives each test its own counters and removes them afterwards.
func testScope(t *testing.T, pool *pgxpool.Pool) string {
	scope := fmt.Sprintf("test_%s_%d", t.Name(), time.Now().UnixNano())
	t.Cleanup(func() { _, _ = pool.Exec(context.Background(), "DELETE FROM rate_limits WHERE scope = $1", scope) })
	return scope
}

func TestCounterAllow(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	c := New(pool, testScope(t, pool), 3, time.Minute)

	for i := range 3 {
		if ok, _, err := c.Allow(ctx, "1.2.3.4"); err != nil || !ok {
			t.Fatalf("event %d: ok=%v err=%v", i+1, ok, err)
		}
	}
	ok, wait, err := c.Allow(ctx, "1.2.3.4")
	if err != nil || ok || wait <= 50*time.Second || wait > time.Minute {
		t.Fatalf("4th event: ok=%v wait=%v err=%v, want refused with ~1m", ok, wait, err)
	}
	if ok, _, _ := c.Allow(ctx, "5.6.7.8"); !ok {
		t.Error("other key refused")
	}
}

func TestCounterWindowResets(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	c := New(pool, testScope(t, pool), 1, 300*time.Millisecond)

	c.Allow(ctx, "k")
	if ok, _, _ := c.Allow(ctx, "k"); ok {
		t.Fatal("second event allowed inside the window")
	}
	time.Sleep(400 * time.Millisecond)
	if ok, _, err := c.Allow(ctx, "k"); err != nil || !ok {
		t.Fatalf("after the window: ok=%v err=%v, want allowed", ok, err)
	}
}

func TestCounterBlockedHitReset(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	c := New(pool, testScope(t, pool), 2, time.Minute)

	if blocked, _, err := c.Blocked(ctx, "ada@example.com"); err != nil || blocked {
		t.Fatalf("before events: blocked=%v err=%v", blocked, err)
	}
	c.Hit(ctx, "ada@example.com")
	c.Hit(ctx, "ada@example.com")
	if blocked, wait, err := c.Blocked(ctx, "ada@example.com"); err != nil || !blocked || wait <= 0 {
		t.Fatalf("after 2 hits: blocked=%v wait=%v err=%v", blocked, wait, err)
	}
	if err := c.Reset(ctx, "ada@example.com"); err != nil {
		t.Fatal(err)
	}
	if blocked, _, _ := c.Blocked(ctx, "ada@example.com"); blocked {
		t.Error("still blocked after Reset")
	}
}

func TestCounterConcurrentReplicas(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	scope := testScope(t, pool)
	// Two counters on one scope stand in for two BFF replicas.
	a, b := New(pool, scope, 10, time.Minute), New(pool, scope, 10, time.Minute)

	var wg sync.WaitGroup
	var mu sync.Mutex
	allowed := 0
	for i := range 40 {
		wg.Add(1)
		go func(c *Counter) {
			defer wg.Done()
			if ok, _, err := c.Allow(ctx, "shared"); err == nil && ok {
				mu.Lock()
				allowed++
				mu.Unlock()
			}
		}([]*Counter{a, b}[i%2])
	}
	wg.Wait()
	if allowed != 10 {
		t.Errorf("allowed %d of 40 concurrent events, want exactly 10", allowed)
	}
}

func TestKeysAreHashed(t *testing.T) {
	pool := testPool(t)
	ctx := context.Background()
	scope := testScope(t, pool)
	New(pool, scope, 5, time.Minute).Hit(ctx, "ada@example.com")

	var stored string
	if err := pool.QueryRow(ctx, "SELECT key_hash FROM rate_limits WHERE scope = $1", scope).Scan(&stored); err != nil {
		t.Fatal(err)
	}
	if stored == "ada@example.com" || len(stored) != 64 {
		t.Errorf("stored key %q, want a SHA-256 hex digest", stored)
	}
}

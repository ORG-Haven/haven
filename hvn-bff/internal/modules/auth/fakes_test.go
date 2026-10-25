package auth

import (
	"context"
	"hvnBff/internal/modules/sessions"
	"hvnBff/internal/modules/users"
	"hvnBff/internal/transport"
	"time"
)

// fakeStore is an in-memory UserStore; err, when set, is returned by Create.
type fakeStore struct {
	err     error
	created []users.User
}

// Create enforces unique usernames and emails, like the Postgres indexes.
func (f *fakeStore) Create(_ context.Context, u users.User) error {
	if f.err != nil {
		return f.err
	}
	for _, c := range f.created {
		if c.Username == u.Username {
			return users.ErrUsernameTaken
		}
		if c.Email == u.Email {
			return users.ErrEmailTaken
		}
	}
	f.created = append(f.created, u)
	return nil
}

func (f *fakeStore) GetByEmail(_ context.Context, email string) (users.User, error) {
	for _, u := range f.created {
		if u.Email == email {
			return u, nil
		}
	}
	return users.User{}, users.ErrNotFound
}

// fakeSessions is an in-memory SessionStore that, like Postgres, ignores expired rows.
type fakeSessions struct {
	rows  map[string]sessions.Session
	users map[users.ID]users.User
	now   func() time.Time
}

func newFakeSessions() *fakeSessions {
	return &fakeSessions{rows: map[string]sessions.Session{}, users: map[users.ID]users.User{}, now: time.Now}
}

func (f *fakeSessions) Create(_ context.Context, s sessions.Session) error {
	f.rows[s.TokenHash] = s
	return nil
}

func (f *fakeSessions) UserByToken(_ context.Context, tokenHash string) (users.User, error) {
	s, ok := f.rows[tokenHash]
	if !ok || !s.ExpiresAt.After(f.now()) {
		return users.User{}, sessions.ErrNotFound
	}
	if u, ok := f.users[s.UserID]; ok {
		return u, nil
	}
	return users.User{Id: s.UserID}, nil
}

func (f *fakeSessions) Delete(_ context.Context, tokenHash string) error {
	delete(f.rows, tokenHash)
	return nil
}

func signedUpUserWithoutPassword() users.User {
	return users.User{Id: users.NewID(), Username: "oauth-user", Email: "oauth@example.com"}
}

// testLimiter keys by the test request's RemoteAddr and counts in memory.
func testLimiter() *AuthLimiter {
	return NewAuthLimiter(func(_ string, limit int, window time.Duration) RateCounter {
		return &memCounter{limit: limit, window: window, entries: map[string]*memEntry{}}
	}, transport.ClientIP(0))
}

// memCounter is an in-memory RateCounter with the same fixed-window rules as ratelimit.Counter.
type memCounter struct {
	limit   int
	window  time.Duration
	entries map[string]*memEntry
}

type memEntry struct {
	count   int
	resetAt time.Time
}

func (m *memCounter) current(key string) *memEntry {
	e, ok := m.entries[key]
	if !ok || !time.Now().Before(e.resetAt) {
		e = &memEntry{resetAt: time.Now().Add(m.window)}
		m.entries[key] = e
	}
	return e
}

func (m *memCounter) Allow(_ context.Context, key string) (bool, time.Duration, error) {
	e := m.current(key)
	e.count++
	if e.count > m.limit {
		return false, time.Until(e.resetAt), nil
	}
	return true, 0, nil
}

func (m *memCounter) Blocked(_ context.Context, key string) (bool, time.Duration, error) {
	e := m.current(key)
	if e.count >= m.limit {
		return true, time.Until(e.resetAt), nil
	}
	return false, 0, nil
}

func (m *memCounter) Hit(ctx context.Context, key string) error {
	_, _, err := m.Allow(ctx, key)
	return err
}

func (m *memCounter) Reset(_ context.Context, key string) error {
	delete(m.entries, key)
	return nil
}

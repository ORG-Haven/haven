package auth

import (
	"context"
	"hvnBff/internal/modules/sessions"
	"hvnBff/internal/modules/users"
	"time"
)

// fakeStore is an in-memory UserStore; err, when set, is returned by Create.
type fakeStore struct {
	err     error
	created []users.User
}

func (f *fakeStore) Create(_ context.Context, u users.User) error {
	if f.err != nil {
		return f.err
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
	return users.User{Id: users.NewID(), Name: "OAuth", Email: "oauth@example.com"}
}

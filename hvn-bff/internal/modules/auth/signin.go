package auth

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"hvnBff/internal/modules/sessions"
	"hvnBff/internal/modules/users"
	"log/slog"
	"strings"
	"sync"
)

// Compared against when the email has no password, so a wrong email takes as
// long as a wrong password and response times don't reveal which emails exist.
var dummyHash = sync.OnceValue(func() string {
	h, _ := HashPassword("not-a-real-password-0")
	return h
})

func (s *Service) SignIn(ctx context.Context, req SignInReq) (AuthResp, error) {
	email := strings.ToLower(strings.TrimSpace(req.Email))

	u, err := s.users.GetByEmail(ctx, email)
	switch {
	case errors.Is(err, users.ErrNotFound):
		CheckPassword(req.Password, dummyHash())
		return AuthResp{}, ErrInvalidCredentials
	case err != nil:
		slog.ErrorContext(ctx, "get user by email", "err", err)
		return AuthResp{}, ErrSignIn
	}
	if u.PasswordHash == "" {
		CheckPassword(req.Password, dummyHash())
		return AuthResp{}, ErrInvalidCredentials
	}
	if !CheckPassword(req.Password, u.PasswordHash) {
		return AuthResp{}, ErrInvalidCredentials
	}

	return s.startSession(ctx, u)
}

// CurrentUser returns the user a session token belongs to.
func (s *Service) CurrentUser(ctx context.Context, token string) (UserCreateResp, error) {
	if token == "" {
		return UserCreateResp{}, ErrUnauthenticated
	}
	u, err := s.sessions.UserByToken(ctx, hashToken(token))
	if errors.Is(err, sessions.ErrNotFound) {
		return UserCreateResp{}, ErrUnauthenticated
	}
	if err != nil {
		slog.ErrorContext(ctx, "get session user", "err", err)
		return UserCreateResp{}, ErrSignIn
	}
	return toUserResp(u), nil
}

// SignOut ends the session. Unknown tokens are not an error: the caller is signed out either way.
func (s *Service) SignOut(ctx context.Context, token string) error {
	if token == "" {
		return nil
	}
	if err := s.sessions.Delete(ctx, hashToken(token)); err != nil {
		slog.ErrorContext(ctx, "delete session", "err", err)
		return ErrSignOut
	}
	return nil
}

func (s *Service) startSession(ctx context.Context, u users.User) (AuthResp, error) {
	token, err := newToken()
	if err != nil {
		slog.ErrorContext(ctx, "generate session token", "err", err)
		return AuthResp{}, ErrCreateSession
	}
	expires := s.now().Add(SessionTTL).UTC()
	if err := s.sessions.Create(ctx, sessions.Session{TokenHash: hashToken(token), UserID: u.Id, ExpiresAt: expires}); err != nil {
		slog.ErrorContext(ctx, "create session", "err", err)
		return AuthResp{}, ErrCreateSession
	}
	return AuthResp{
		User:    toUserResp(u),
		Session: SessionResp{Token: token, ExpiresAt: expires},
	}, nil
}

func newToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

func hashToken(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func toUserResp(u users.User) UserCreateResp {
	return UserCreateResp{Id: u.Id, Name: u.Name, Email: u.Email}
}

// SignUp creates the account and signs the new user straight in.
func (s *Service) SignUp(ctx context.Context, req UserCreateReq) (AuthResp, error) {
	created, err := s.AppSignUp(ctx, req)
	if err != nil {
		return AuthResp{}, err
	}
	return s.startSession(ctx, users.User{Id: created.Id, Name: created.Name, Email: created.Email})
}

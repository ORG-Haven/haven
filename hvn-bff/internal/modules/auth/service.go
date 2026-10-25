package auth

import (
	"context"
	"errors"
	"hvnBff/internal/modules/sessions"
	"hvnBff/internal/modules/users"
	"log/slog"
	"net/mail"
	"strings"
	"time"
)

type UserStore interface {
	Create(ctx context.Context, u users.User) error
	GetByEmail(ctx context.Context, email string) (users.User, error)
}

type SessionStore interface {
	Create(ctx context.Context, s sessions.Session) error
	UserByToken(ctx context.Context, tokenHash string) (users.User, error)
	Delete(ctx context.Context, tokenHash string) error
}

type Service struct {
	users    UserStore
	sessions SessionStore
	now      func() time.Time
}

func NewService(userStore UserStore, sessionStore SessionStore) *Service {
	return &Service{users: userStore, sessions: sessionStore, now: time.Now}
}

func (s *Service) AppSignUp(ctx context.Context, req UserCreateReq) (UserCreateResp, error) {
	username := strings.ToLower(strings.TrimSpace(req.Username))
	email := strings.ToLower(strings.TrimSpace(req.Email))

	if !IsValidUsername(username) {
		return UserCreateResp{}, ErrInvalidUsername
	}
	if !isValidEmail(email) {
		return UserCreateResp{}, ErrInvalidEmail
	}
	if !IsValidPassword(req.Password) {
		return UserCreateResp{}, ErrInvalidPassword
	}

	hash, err := HashPassword(req.Password)
	if err != nil {
		slog.ErrorContext(ctx, "hash password", "err", err)
		return UserCreateResp{}, ErrHashPassword
	}

	newUser := users.User{
		Id:           users.NewID(),
		Username:     username,
		Email:        email,
		PasswordHash: hash,
	}
	if err := s.users.Create(ctx, newUser); err != nil {
		if errors.Is(err, users.ErrEmailTaken) {
			return UserCreateResp{}, ErrEmailTaken
		}
		if errors.Is(err, users.ErrUsernameTaken) {
			return UserCreateResp{}, ErrUsernameTaken
		}
		slog.ErrorContext(ctx, "create user", "err", err)
		return UserCreateResp{}, ErrCreateUser
	}

	return UserCreateResp{
		Id:       newUser.Id,
		Username: newUser.Username,
		Email:    newUser.Email,
	}, nil
}

func isValidEmail(email string) bool {
	addr, err := mail.ParseAddress(email)
	return err == nil && addr.Address == email
}

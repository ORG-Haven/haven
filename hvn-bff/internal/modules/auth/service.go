package auth

import (
	"context"
	"errors"
	"hvnBff/internal/modules/users"
	"log/slog"
	"net/mail"
	"strings"
)

type UserStore interface {
	Create(ctx context.Context, u users.User) error
}

type Service struct {
	users UserStore
}

func NewService(store UserStore) *Service {
	return &Service{users: store}
}

func (s *Service) AppSignUp(ctx context.Context, req UserCreateReq) (UserCreateResp, error) {
	name := strings.TrimSpace(req.Name)
	email := strings.ToLower(strings.TrimSpace(req.Email))

	if name == "" {
		return UserCreateResp{}, ErrInvalidName
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
		Name:         name,
		Email:        email,
		PasswordHash: hash,
	}
	if err := s.users.Create(ctx, newUser); err != nil {
		if errors.Is(err, users.ErrEmailTaken) {
			return UserCreateResp{}, ErrEmailTaken
		}
		slog.ErrorContext(ctx, "create user", "err", err)
		return UserCreateResp{}, ErrCreateUser
	}

	return UserCreateResp{
		Id:    newUser.Id,
		Name:  newUser.Name,
		Email: newUser.Email,
	}, nil
}

func isValidEmail(email string) bool {
	addr, err := mail.ParseAddress(email)
	return err == nil && addr.Address == email
}

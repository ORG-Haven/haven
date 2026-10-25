package auth

import "errors"

var (
	ErrInvalidName     = errors.New("invalid name")
	ErrInvalidEmail    = errors.New("invalid email")
	ErrInvalidPassword = errors.New("password does not meet the requirements")
	ErrEmailTaken      = errors.New("email already in use")
	ErrHashPassword    = errors.New("hash password")
	ErrCreateUser      = errors.New("create user")
)

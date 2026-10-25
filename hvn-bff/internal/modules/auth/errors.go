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

var (
	ErrInvalidCredentials = errors.New("invalid email or password")
	ErrUnauthenticated    = errors.New("not signed in")
	ErrSignIn             = errors.New("sign in")
	ErrSignOut            = errors.New("sign out")
	ErrCreateSession      = errors.New("create session")
)

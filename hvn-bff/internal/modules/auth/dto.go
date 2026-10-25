package auth

import (
	"hvnBff/internal/modules/users"
	"time"
)

type UserCreateReq struct {
	Username string `json:"username"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserCreateResp struct {
	Id       users.ID `json:"id"`
	Username string   `json:"username"`
	Email    string   `json:"email"`
}

type SignInReq struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type SessionResp struct {
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

type AuthResp struct {
	User    UserCreateResp `json:"user"`
	Session SessionResp    `json:"session"`
}

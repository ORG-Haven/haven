package auth

import "hvnBff/internal/modules/users"

type UserCreateReq struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
}

type UserCreateResp struct {
	Id    users.ID `json:"id"`
	Name  string   `json:"name"`
	Email string   `json:"email"`
}

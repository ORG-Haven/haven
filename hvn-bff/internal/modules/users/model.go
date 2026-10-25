package users

import "github.com/google/uuid"

type ID string

type User struct {
	Id           ID
	Username     string
	Email        string
	PasswordHash string
}

func NewID() ID {
	return ID(uuid.NewString())
}

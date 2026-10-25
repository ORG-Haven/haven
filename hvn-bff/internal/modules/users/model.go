package users

import "github.com/google/uuid"

type ID string

type User struct {
	Id    ID
	Name  string
	Email string
}

func NewID() ID {
	return ID(uuid.NewString())
}

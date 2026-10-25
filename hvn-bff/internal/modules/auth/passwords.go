package auth

import (
	"strings"

	"golang.org/x/crypto/bcrypt"
)

const (
	minPasswordLen   = 8
	maxPasswordBytes = 72
)

// IsValidPassword applies the same rules the console shows on its sign-up form:
// at least 8 characters, a letter and a number.
func IsValidPassword(p string) bool {
	return len([]rune(p)) >= minPasswordLen &&
		len(p) <= maxPasswordBytes &&
		strings.ContainsFunc(p, isASCIILetter) &&
		strings.ContainsAny(p, "0123456789")
}

func isASCIILetter(r rune) bool {
	return ('a' <= r && r <= 'z') || ('A' <= r && r <= 'Z')
}

func HashPassword(password string) (string, error) {
	hash, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)
	if err != nil {
		return "", err
	}
	return string(hash), nil
}

func CheckPassword(password, hash string) bool {
	return bcrypt.CompareHashAndPassword(
		[]byte(hash),
		[]byte(password),
	) == nil
}

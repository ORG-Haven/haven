package auth

import "regexp"

// 3 to 32 characters of a-z, 0-9 and hyphens, starting and ending with a letter or digit.
// Callers lower-case first; usernames are stored lower case.
var usernamePattern = regexp.MustCompile(`^[a-z0-9][a-z0-9-]{1,30}[a-z0-9]$`)

func IsValidUsername(u string) bool {
	return usernamePattern.MatchString(u)
}

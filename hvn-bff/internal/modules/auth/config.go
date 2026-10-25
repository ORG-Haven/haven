package auth

import "time"

// SessionTTL is how long a sign-in lasts before the user has to sign in again.
const SessionTTL = 30 * 24 * time.Hour

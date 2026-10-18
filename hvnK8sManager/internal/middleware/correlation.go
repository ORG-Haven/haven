package middleware

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"net/http"
	"strings"
)

const CorrelationHeader = "X-Correlation-ID"

// maxCorrelationIDLen caps client supplied ids so they cannot bloat logs or downstream headers.
const maxCorrelationIDLen = 128

type correlationIDKey struct{}

// CorrelationIDFromContext returns the correlation id set by the Correlation middleware.
func CorrelationIDFromContext(ctx context.Context) string {
	crID, _ := ctx.Value(correlationIDKey{}).(string)
	return crID
}

// Correlation ensures every request carries a correlation id. The BFF is expected to send one,
// but a missing or malformed id is replaced with a generated one instead of failing the request.
func Correlation(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		crID := strings.TrimSpace(r.Header.Get(CorrelationHeader))

		switch {
		case crID == "":
			crID = newCorrelationID()
			slog.Warn("correlation id missing, generated one",
				"correlation_id", crID,
				"endpoint", r.URL.Path,
				"method", r.Method,
				"client_ip", ClientIPFromContext(r.Context()),
			)
		case !validCorrelationID(crID):
			// The invalid value is not logged since it is untrusted input of arbitrary size.
			invalidLen := len(crID)
			crID = newCorrelationID()
			slog.Warn("correlation id invalid, generated one",
				"correlation_id", crID,
				"received_length", invalidLen,
				"endpoint", r.URL.Path,
				"method", r.Method,
				"client_ip", ClientIPFromContext(r.Context()),
			)
		}

		w.Header().Set(CorrelationHeader, crID)
		ctx := context.WithValue(r.Context(), correlationIDKey{}, crID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func validCorrelationID(id string) bool {
	if len(id) > maxCorrelationIDLen {
		return false
	}
	for _, c := range id {
		switch {
		case c >= 'a' && c <= 'z', c >= 'A' && c <= 'Z', c >= '0' && c <= '9', c == '-', c == '_', c == '.':
		default:
			return false
		}
	}
	return true
}

// newCorrelationID returns a random RFC 4122 version 4 UUID.
func newCorrelationID() string {
	var b [16]byte
	_, _ = rand.Read(b[:]) // crypto/rand.Read never returns an error
	b[6] = (b[6] & 0x0f) | 0x40
	b[8] = (b[8] & 0x3f) | 0x80
	return fmt.Sprintf("%x-%x-%x-%x-%x", b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

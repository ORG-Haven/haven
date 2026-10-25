package transport

import (
	"net/http"
	"slices"
)

// CheckOrigin rejects state-changing requests sent by a browser from any origin not in allowed.
// Browsers always send Origin on cross-site POSTs, so a page elsewhere can't use the session
// cookie on the user's behalf. Requests without Origin (the CLI, curl, server to server) pass;
// they authenticate with a bearer token rather than the cookie.
func CheckOrigin(allowed []string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			switch r.Method {
			case http.MethodGet, http.MethodHead, http.MethodOptions:
			default:
				if origin := r.Header.Get("Origin"); origin != "" && !slices.Contains(allowed, origin) {
					WriteError(w, http.StatusForbidden, "This request came from a site Haven doesn’t trust.")
					return
				}
			}
			next.ServeHTTP(w, r)
		})
	}
}

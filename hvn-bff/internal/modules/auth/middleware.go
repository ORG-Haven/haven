package auth

import (
	"context"
	"errors"
	"hvnBff/internal/transport"
	"net/http"
)

type sessionKey struct{}

type session struct {
	user  UserCreateResp
	token string
}

// RequireSession lets a request through only with a valid session cookie or bearer token,
// and puts the signed-in user in its context (read it with UserFrom). Anything else gets
// 401 and the next handler never runs. A cookie that no longer matches a session is cleared,
// so the console's proxy stops treating the browser as signed in.
func (h *Handler) RequireSession(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		token := h.sessionToken(r)
		user, err := h.service.CurrentUser(r.Context(), token)
		if err != nil {
			if errors.Is(err, ErrUnauthenticated) && h.cookie.token(r) != "" {
				h.cookie.clear(w)
			}
			status, msg := authError(err)
			transport.WriteError(w, status, msg)
			return
		}
		ctx := context.WithValue(r.Context(), sessionKey{}, session{user: user, token: token})
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// UserFrom returns the signed-in user. ok is false outside RequireSession, which is a
// programming error in a protected handler: treat it as unauthenticated.
func UserFrom(ctx context.Context) (user UserCreateResp, ok bool) {
	s, ok := ctx.Value(sessionKey{}).(session)
	return s.user, ok
}

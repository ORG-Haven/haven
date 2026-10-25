package auth

import (
	"errors"
	"hvnBff/internal/transport"
	"net/http"
	"strings"
)

type Handler struct {
	service *Service
	cookie  CookieConfig
	limiter *AuthLimiter
}

func NewHandler(service *Service, cookie CookieConfig, limiter *AuthLimiter) *Handler {
	return &Handler{service: service, cookie: cookie, limiter: limiter}
}

// SignUp handles POST /auth/signup with {"username","email","password"}. It signs the new user in
// by setting the session cookie; the body carries only the user. Attempts are rate limited
// per client address (see AuthLimiter).
func (h *Handler) SignUp(w http.ResponseWriter, r *http.Request) {
	if refuse, wait := h.limiter.beforeSignUp(r); refuse {
		writeTooManyAttempts(w, "sign-up", wait)
		return
	}

	var req UserCreateReq
	if err := transport.ReadJSON(w, r, &req); err != nil {
		transport.WriteError(w, http.StatusBadRequest, "The request could not be read.")
		return
	}

	resp, err := h.service.SignUp(r.Context(), req)
	if err != nil {
		status, msg := authError(err)
		transport.WriteErrorCode(w, status, signUpErrorCode(err), msg)
		return
	}
	h.cookie.set(w, resp.Session.Token, resp.Session.ExpiresAt)
	transport.WriteJSON(w, http.StatusCreated, userBody{User: resp.User})
}

// SignIn handles POST /auth/signin with {"email","password"} and sets the session cookie.
// Attempts are rate limited per client address and per account (see AuthLimiter).
func (h *Handler) SignIn(w http.ResponseWriter, r *http.Request) {
	var req SignInReq
	if err := transport.ReadJSON(w, r, &req); err != nil {
		transport.WriteError(w, http.StatusBadRequest, "The request could not be read.")
		return
	}

	key := limiterKey(req.Email)
	if refuse, wait := h.limiter.beforeSignIn(r, key); refuse {
		writeTooManyAttempts(w, "sign-in", wait)
		return
	}

	resp, err := h.service.SignIn(r.Context(), req)
	if err != nil {
		if errors.Is(err, ErrInvalidCredentials) {
			h.limiter.signInFailed(r.Context(), key)
		}
		status, msg := authError(err)
		transport.WriteError(w, status, msg)
		return
	}
	h.limiter.signInSucceeded(r.Context(), key)
	h.cookie.set(w, resp.Session.Token, resp.Session.ExpiresAt)
	transport.WriteJSON(w, http.StatusOK, userBody{User: resp.User})
}

// Session handles GET /auth/session behind RequireSession and returns the signed-in user.
func (h *Handler) Session(w http.ResponseWriter, r *http.Request) {
	user, ok := UserFrom(r.Context())
	if !ok {
		transport.WriteError(w, http.StatusUnauthorized, "You’re not signed in.")
		return
	}
	transport.WriteJSON(w, http.StatusOK, userBody{User: user})
}

// SignOut handles POST /auth/signout: it ends the session, if there is one, and clears the
// cookie. It is public on purpose, so a browser holding an expired cookie can still sign out.
func (h *Handler) SignOut(w http.ResponseWriter, r *http.Request) {
	// Clear first, so the browser is signed out even if deleting the row fails.
	h.cookie.clear(w)
	if err := h.service.SignOut(r.Context(), h.sessionToken(r)); err != nil {
		status, msg := authError(err)
		transport.WriteError(w, status, msg)
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

type userBody struct {
	User UserCreateResp `json:"user"`
}

// sessionToken takes the browser's session cookie, or a bearer token from other clients.
func (h *Handler) sessionToken(r *http.Request) string {
	if t := h.cookie.token(r); t != "" {
		return t
	}
	token, _ := strings.CutPrefix(r.Header.Get("Authorization"), "Bearer ")
	return strings.TrimSpace(token)
}

// authError maps service errors to a status and a message the console can show as is.
func authError(err error) (int, string) {
	switch {
	case errors.Is(err, ErrInvalidUsername):
		return http.StatusBadRequest, "Usernames are 3 to 32 characters: lowercase letters, numbers and hyphens, starting and ending with a letter or number."
	case errors.Is(err, ErrInvalidEmail):
		return http.StatusBadRequest, "Enter a valid email address."
	case errors.Is(err, ErrInvalidPassword):
		return http.StatusBadRequest, "Use 8 to 72 characters, with at least one letter and one number."
	case errors.Is(err, ErrEmailTaken):
		return http.StatusConflict, "An account with this email already exists."
	case errors.Is(err, ErrUsernameTaken):
		return http.StatusConflict, "That username is taken. Try another."
	case errors.Is(err, ErrInvalidCredentials):
		return http.StatusUnauthorized, "That email and password don’t match."
	case errors.Is(err, ErrUnauthenticated):
		return http.StatusUnauthorized, "You’re not signed in."
	case errors.Is(err, ErrCreateSession):
		return http.StatusInternalServerError, "We couldn’t sign you in. Try again in a moment."
	default:
		return http.StatusInternalServerError, "Something went wrong on our side. Try again in a moment."
	}
}

// signUpErrorCode names the field that clashed, so the console can offer "sign in instead"
// for a taken email but not for a taken username.
func signUpErrorCode(err error) string {
	switch {
	case errors.Is(err, ErrEmailTaken):
		return "email_taken"
	case errors.Is(err, ErrUsernameTaken):
		return "username_taken"
	}
	return ""
}

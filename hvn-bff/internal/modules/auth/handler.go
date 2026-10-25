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
}

func NewHandler(service *Service, cookie CookieConfig) *Handler {
	return &Handler{service: service, cookie: cookie}
}

// SignUp handles POST /auth/signup with {"name","email","password"}. It signs the new user in
// by setting the session cookie; the body carries only the user.
func (h *Handler) SignUp(w http.ResponseWriter, r *http.Request) {
	var req UserCreateReq
	if err := transport.ReadJSON(w, r, &req); err != nil {
		transport.WriteError(w, http.StatusBadRequest, "The request could not be read.")
		return
	}

	resp, err := h.service.SignUp(r.Context(), req)
	if err != nil {
		status, msg := authError(err)
		transport.WriteError(w, status, msg)
		return
	}
	h.cookie.set(w, resp.Session.Token, resp.Session.ExpiresAt)
	transport.WriteJSON(w, http.StatusCreated, userBody{User: resp.User})
}

// SignIn handles POST /auth/signin with {"email","password"} and sets the session cookie.
func (h *Handler) SignIn(w http.ResponseWriter, r *http.Request) {
	var req SignInReq
	if err := transport.ReadJSON(w, r, &req); err != nil {
		transport.WriteError(w, http.StatusBadRequest, "The request could not be read.")
		return
	}

	resp, err := h.service.SignIn(r.Context(), req)
	if err != nil {
		status, msg := authError(err)
		transport.WriteError(w, status, msg)
		return
	}
	h.cookie.set(w, resp.Session.Token, resp.Session.ExpiresAt)
	transport.WriteJSON(w, http.StatusOK, userBody{User: resp.User})
}

// Session handles GET /auth/session and returns the signed-in user. A cookie that no longer
// matches a session is cleared, so the console's proxy stops treating the browser as signed in.
func (h *Handler) Session(w http.ResponseWriter, r *http.Request) {
	user, err := h.service.CurrentUser(r.Context(), h.sessionToken(r))
	if err != nil {
		if errors.Is(err, ErrUnauthenticated) && h.cookie.token(r) != "" {
			h.cookie.clear(w)
		}
		status, msg := authError(err)
		transport.WriteError(w, status, msg)
		return
	}
	transport.WriteJSON(w, http.StatusOK, userBody{User: user})
}

// SignOut handles POST /auth/signout: it ends the session and clears the cookie.
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
	case errors.Is(err, ErrInvalidName):
		return http.StatusBadRequest, "Enter your name."
	case errors.Is(err, ErrInvalidEmail):
		return http.StatusBadRequest, "Enter a valid email address."
	case errors.Is(err, ErrInvalidPassword):
		return http.StatusBadRequest, "Use 8 to 72 characters, with at least one letter and one number."
	case errors.Is(err, ErrEmailTaken):
		return http.StatusConflict, "An account with this email already exists."
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

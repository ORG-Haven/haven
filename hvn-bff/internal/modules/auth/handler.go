package auth

import (
	"errors"
	"hvnBff/internal/transport"
	"net/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

// SignUp handles POST /auth/signup with {"name","email","password"}.
func (h *Handler) SignUp(w http.ResponseWriter, r *http.Request) {
	var req UserCreateReq
	if err := transport.ReadJSON(w, r, &req); err != nil {
		transport.WriteError(w, http.StatusBadRequest, "The request could not be read.")
		return
	}

	resp, err := h.service.AppSignUp(r.Context(), req)
	if err != nil {
		status, msg := signUpError(err)
		transport.WriteError(w, status, msg)
		return
	}
	transport.WriteJSON(w, http.StatusCreated, resp)
}

// signUpError maps service errors to a status and a message the console can show as is.
func signUpError(err error) (int, string) {
	switch {
	case errors.Is(err, ErrInvalidName):
		return http.StatusBadRequest, "Enter your name."
	case errors.Is(err, ErrInvalidEmail):
		return http.StatusBadRequest, "Enter a valid email address."
	case errors.Is(err, ErrInvalidPassword):
		return http.StatusBadRequest, "Use 8 to 72 characters, with at least one letter and one number."
	case errors.Is(err, ErrEmailTaken):
		return http.StatusConflict, "An account with this email already exists."
	default:
		return http.StatusInternalServerError, "We couldn’t create your account. Try again in a moment."
	}
}

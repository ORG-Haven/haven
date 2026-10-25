package transport

import "net/http"

// ErrorResponse is the body of every error reply. The console shows Message to the user.
type ErrorResponse struct {
	Message string `json:"message"`
}

func WriteError(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, ErrorResponse{Message: msg})
}

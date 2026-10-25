package transport

import "net/http"

// ErrorResponse is the body of every error reply. The console shows Message to the user;
// Code, when set, lets it tell apart errors that share a status (say, which field clashed).
type ErrorResponse struct {
	Message string `json:"message"`
	Code    string `json:"code,omitempty"`
}

func WriteError(w http.ResponseWriter, status int, msg string) {
	WriteJSON(w, status, ErrorResponse{Message: msg})
}

func WriteErrorCode(w http.ResponseWriter, status int, code, msg string) {
	WriteJSON(w, status, ErrorResponse{Message: msg, Code: code})
}

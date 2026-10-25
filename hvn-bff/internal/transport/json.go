package transport

import (
	"encoding/json"
	"errors"
	"net/http"
)

// Requests are small JSON forms; anything bigger is a mistake or abuse.
const maxBodyBytes = 1 << 20

var ErrBadJSON = errors.New("request body is not valid JSON")

func WriteJSON(w http.ResponseWriter, status int, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(data)
}

// ReadJSON decodes the request body into dst, rejecting bodies over 1 MiB.
func ReadJSON(w http.ResponseWriter, r *http.Request, dst any) error {
	r.Body = http.MaxBytesReader(w, r.Body, maxBodyBytes)
	if err := json.NewDecoder(r.Body).Decode(dst); err != nil {
		return ErrBadJSON
	}
	return nil
}

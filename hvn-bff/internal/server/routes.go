package server

import (
	"context"
	"net/http"
	"time"

	"hvnBff/internal/modules/auth"
	"hvnBff/internal/transport"

	"github.com/go-chi/chi/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

func NewRouter(pool *pgxpool.Pool, authHandler *auth.Handler, allowedOrigins []string) http.Handler {
	r := chi.NewRouter()
	r.Use(transport.CheckOrigin(allowedOrigins))

	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Get("/readyz", func(w http.ResponseWriter, r *http.Request) {
		ctx, cancel := context.WithTimeout(r.Context(), 2*time.Second)
		defer cancel()
		if err := pool.Ping(ctx); err != nil {
			http.Error(w, "database unavailable", http.StatusServiceUnavailable)
			return
		}
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	// Public endpoints are listed here on purpose. Everything else goes in the protected group
	// below, so a new endpoint needs a session unless someone decides otherwise.
	r.Group(func(r chi.Router) {
		r.Post("/auth/signup", authHandler.SignUp)
		r.Post("/auth/signin", authHandler.SignIn)
		r.Post("/auth/signout", authHandler.SignOut)
	})

	r.Group(func(r chi.Router) {
		r.Use(authHandler.RequireSession)
		r.Get("/auth/session", authHandler.Session)
	})

	return r
}

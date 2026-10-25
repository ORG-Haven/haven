package main

import (
	"context"
	"errors"
	"hvnBff/internal/db"
	"hvnBff/internal/modules/auth"
	"hvnBff/internal/modules/sessions"
	"hvnBff/internal/modules/users"
	"hvnBff/internal/server"
	"log"
	"net/http"
	"os"
	"os/signal"
	"strings"
	"syscall"
	"time"
)

func main() {
	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	pool, err := db.Connect(ctx, os.Getenv("DATABASE_URL"))
	if err != nil {
		log.Fatalf("Could not connect to the database: %v", err)
	}
	defer pool.Close()

	if err := db.Migrate(ctx, pool); err != nil {
		log.Fatalf("Could not migrate the database: %v", err)
	}

	sessionRepo := sessions.NewRepository(pool)
	go sweepExpiredSessions(ctx, sessionRepo)

	cookie := auth.CookieConfig{Secure: os.Getenv("COOKIE_SECURE") != "false"}
	if !cookie.Secure {
		log.Printf("COOKIE_SECURE=false: the session cookie is sent over plain HTTP. Use only for local development.")
	}

	authHandler := auth.NewHandler(auth.NewService(users.NewRepository(pool), sessionRepo), cookie)
	router := server.NewRouter(pool, authHandler, allowedOrigins())

	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	errCh := make(chan error, 1)

	go func() {
		log.Printf("Listening on :%s", port)
		errCh <- srv.ListenAndServe()
	}()

	select {
	case err := <-errCh:
		if err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("Server failed: %v", err)
		}

	case <-ctx.Done():
		shutdownCtx, cancel := context.WithTimeout(
			context.Background(),
			10*time.Second,
		)
		defer cancel()

		if err := srv.Shutdown(shutdownCtx); err != nil {
			log.Printf("Shutdown failed: %v", err)
			_ = srv.Close()
		}

		if err := <-errCh; err != nil &&
			!errors.Is(err, http.ErrServerClosed) {
			log.Printf("Server stopped: %v", err)
		}
	}
}

// allowedOrigins reads ALLOWED_ORIGINS, a comma-separated list of the console's public origins
// (for example https://app.haven.dev). State-changing browser requests from anywhere else are refused.
func allowedOrigins() []string {
	raw := os.Getenv("ALLOWED_ORIGINS")
	if raw == "" {
		raw = "http://localhost:3000"
	}
	var origins []string
	for _, o := range strings.Split(raw, ",") {
		if o = strings.TrimSuffix(strings.TrimSpace(o), "/"); o != "" {
			origins = append(origins, o)
		}
	}
	return origins
}

// sweepExpiredSessions deletes expired sessions every hour until ctx is cancelled.
// Lookups already ignore expired rows; this only keeps the table small.
func sweepExpiredSessions(ctx context.Context, repo *sessions.Repository) {
	ticker := time.NewTicker(time.Hour)
	defer ticker.Stop()
	for {
		if n, err := repo.DeleteExpired(ctx); err != nil {
			if ctx.Err() == nil {
				log.Printf("Could not delete expired sessions: %v", err)
			}
		} else if n > 0 {
			log.Printf("Deleted %d expired sessions", n)
		}
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
		}
	}
}

package main

import (
	"context"
	"errors"
	"hvnK8sManager/internal/middleware"
	"hvnK8sManager/internal/modules/environments"
	"hvnK8sManager/internal/server"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"
)

func main() {
	envService, err := environments.NewService()
	if err != nil {
		log.Fatalf("Could not initialize the k8s client: %v", err)
	}
	envHandler := environments.NewHandler(envService)

	// Comma separated CIDRs/IPs of proxies allowed to set X-Forwarded-For (e.g. the ingress).
	// Empty by default, so the peer address is always used.
	trustedProxies, err := middleware.ParseTrustedProxies(os.Getenv("TRUSTED_PROXIES"))
	if err != nil {
		log.Fatalf("Invalid TRUSTED_PROXIES: %v", err)
	}

	router := server.NewRouter(*envHandler, trustedProxies)

	//TODO: move this to env
	port := "8080"

	srv := &http.Server{
		Addr:              ":" + port,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
		ReadTimeout:       10 * time.Second,
		WriteTimeout:      15 * time.Second,
		IdleTimeout:       60 * time.Second,
	}

	ctx, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

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

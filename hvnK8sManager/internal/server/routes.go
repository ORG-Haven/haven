package server

import (
	"hvnK8sManager/internal/middleware"
	"hvnK8sManager/internal/modules/environments"
	"net/http"
	"net/netip"

	"github.com/go-chi/chi/v5"
)

func NewRouter(envHandler environments.Handler, trustedProxies []netip.Prefix) http.Handler {
	r := chi.NewRouter()

	// Probes are kept outside the middleware chain so they never need a correlation id
	// and do not flood the access log.
	r.Get("/healthz", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		_, _ = w.Write([]byte("ok"))
	})

	r.Group(func(r chi.Router) {
		r.Use(middleware.ClientIP(trustedProxies))
		r.Use(middleware.Correlation)
		r.Use(middleware.Access)

		r.Route("/api/v1", func(r chi.Router) {
			r.Route("/environments", func(r chi.Router) {
				r.Get("/", envHandler.List)
			})
		})
	})

	return r
}

package environments

import (
	"hvnK8sManager/internal/middleware"
	"hvnK8sManager/internal/transport/httpapi"
	"log/slog"
	"net/http"
)

type Handler struct {
	service *Service
}

func NewHandler(service *Service) *Handler {
	return &Handler{service: service}
}

func (h *Handler) List(w http.ResponseWriter, r *http.Request) {
	envs, err := h.service.List(r.Context())
	if err != nil {
		// Details stay in the logs; clients only get a generic message.
		slog.Error("failed to list environments",
			"error", err,
			"correlation_id", middleware.CorrelationIDFromContext(r.Context()),
		)
		httpapi.WriteError(w, http.StatusInternalServerError, "internal error")
		return
	}
	httpapi.WriteJSON(w, http.StatusOK, envs)
}

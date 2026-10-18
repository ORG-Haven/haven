# syntax=docker/dockerfile:1

# ---- build ----
FROM golang:1.27.1 AS build

WORKDIR /src

COPY go.mod go.sum ./
RUN --mount=type=cache,target=/go/pkg/mod \
    go mod download && go mod verify

COPY cmd ./cmd
COPY internal ./internal

ARG TARGETOS=linux
ARG TARGETARCH

RUN --mount=type=cache,target=/go/pkg/mod \
    --mount=type=cache,target=/root/.cache/go-build \
    CGO_ENABLED=0 GOOS=${TARGETOS} GOARCH=${TARGETARCH} \
    go build -trimpath -ldflags="-s -w" -o /out/hvn-k8s-manager ./cmd

# ---- runtime ----
FROM gcr.io/distroless/static-debian12:nonroot

COPY --from=build /out/hvn-k8s-manager /hvn-k8s-manager

USER 65532:65532
EXPOSE 8080

ENTRYPOINT ["/hvn-k8s-manager"]

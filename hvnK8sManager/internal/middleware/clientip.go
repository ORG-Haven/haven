package middleware

import (
	"context"
	"fmt"
	"net"
	"net/http"
	"net/netip"
	"strings"
)

type clientIPKey struct{}

// ClientIPFromContext returns the client ip resolved by the ClientIP middleware.
func ClientIPFromContext(ctx context.Context) string {
	ip, _ := ctx.Value(clientIPKey{}).(string)
	return ip
}

// ParseTrustedProxies parses a comma separated list of CIDRs or single IPs.
func ParseTrustedProxies(raw string) ([]netip.Prefix, error) {
	var prefixes []netip.Prefix
	for _, part := range strings.Split(raw, ",") {
		part = strings.TrimSpace(part)
		if part == "" {
			continue
		}
		if !strings.Contains(part, "/") {
			addr, err := netip.ParseAddr(part)
			if err != nil {
				return nil, fmt.Errorf("invalid trusted proxy %q: %w", part, err)
			}
			prefixes = append(prefixes, netip.PrefixFrom(addr, addr.BitLen()))
			continue
		}
		prefix, err := netip.ParsePrefix(part)
		if err != nil {
			return nil, fmt.Errorf("invalid trusted proxy %q: %w", part, err)
		}
		prefixes = append(prefixes, prefix.Masked())
	}
	return prefixes, nil
}

// ClientIP resolves the real client ip. X-Forwarded-For is only honoured when the direct peer is a
// trusted proxy, otherwise any client could spoof its address. With no trusted proxies the peer
// address is used as is.
func ClientIP(trustedProxies []netip.Prefix) func(http.Handler) http.Handler {
	isTrusted := func(addr netip.Addr) bool {
		addr = addr.Unmap()
		for _, p := range trustedProxies {
			if p.Contains(addr) {
				return true
			}
		}
		return false
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ip := peerIP(r.RemoteAddr)

			if peer, err := netip.ParseAddr(ip); err == nil && isTrusted(peer) {
				// Walk right to left: the rightmost untrusted hop is the real client.
				hops := strings.Split(strings.Join(r.Header.Values("X-Forwarded-For"), ","), ",")
				for i := len(hops) - 1; i >= 0; i-- {
					hop, err := netip.ParseAddr(strings.TrimSpace(hops[i]))
					if err != nil {
						break
					}
					ip = hop.Unmap().String()
					if !isTrusted(hop) {
						break
					}
				}
			}

			ctx := context.WithValue(r.Context(), clientIPKey{}, ip)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func peerIP(remoteAddr string) string {
	host, _, err := net.SplitHostPort(remoteAddr)
	if err != nil {
		return remoteAddr
	}
	return host
}

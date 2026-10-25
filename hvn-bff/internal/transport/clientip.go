package transport

import (
	"net"
	"net/http"
	"strings"
)

// ClientIP returns a function that finds the caller's IP address.
//
// trustedHops is how many proxies in front of the BFF add to X-Forwarded-For. The address
// that many entries from the right is the one the outermost trusted proxy saw; anything to
// its left was sent by the client and can be forged. With 0 the header is ignored and the
// TCP peer is used.
func ClientIP(trustedHops int) func(*http.Request) string {
	return func(r *http.Request) string {
		if trustedHops > 0 {
			var hops []string
			for _, h := range r.Header.Values("X-Forwarded-For") {
				for _, part := range strings.Split(h, ",") {
					if p := strings.TrimSpace(part); p != "" {
						hops = append(hops, p)
					}
				}
			}
			if i := len(hops) - trustedHops; i >= 0 && i < len(hops) {
				if ip := net.ParseIP(hops[i]); ip != nil {
					return ip.String()
				}
			}
		}
		host, _, err := net.SplitHostPort(r.RemoteAddr)
		if err != nil {
			return r.RemoteAddr
		}
		return host
	}
}

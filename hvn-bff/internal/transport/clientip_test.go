package transport

import (
	"net/http/httptest"
	"testing"
)

func TestClientIP(t *testing.T) {
	tests := []struct {
		name   string
		hops   int
		remote string
		xff    []string
		want   string
	}{
		{name: "no proxies uses peer", hops: 0, remote: "192.0.2.10:5000", xff: []string{"203.0.113.1"}, want: "192.0.2.10"},
		{name: "one proxy takes last entry", hops: 1, remote: "10.0.0.2:5000", xff: []string{"203.0.113.1"}, want: "203.0.113.1"},
		{name: "forged entries left of the trusted one are ignored", hops: 1, remote: "10.0.0.2:5000", xff: []string{"6.6.6.6, 203.0.113.1"}, want: "203.0.113.1"},
		{name: "two proxies", hops: 2, remote: "10.0.0.2:5000", xff: []string{"6.6.6.6, 203.0.113.1, 10.0.0.9"}, want: "203.0.113.1"},
		{name: "split header lines", hops: 1, remote: "10.0.0.2:5000", xff: []string{"6.6.6.6", "203.0.113.1"}, want: "203.0.113.1"},
		{name: "missing header falls back to peer", hops: 1, remote: "10.0.0.2:5000", want: "10.0.0.2"},
		{name: "fewer entries than hops falls back to peer", hops: 2, remote: "10.0.0.2:5000", xff: []string{"203.0.113.1"}, want: "10.0.0.2"},
		{name: "garbage falls back to peer", hops: 1, remote: "10.0.0.2:5000", xff: []string{"not-an-ip"}, want: "10.0.0.2"},
		{name: "ipv6", hops: 1, remote: "[::1]:5000", xff: []string{"2001:db8::1"}, want: "2001:db8::1"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/", nil)
			r.RemoteAddr = tt.remote
			for _, v := range tt.xff {
				r.Header.Add("X-Forwarded-For", v)
			}
			if got := ClientIP(tt.hops)(r); got != tt.want {
				t.Errorf("ClientIP = %q, want %q", got, tt.want)
			}
		})
	}
}

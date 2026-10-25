package auth

import (
	"context"
	"errors"
	"testing"
	"time"
)

func signedUpService(t *testing.T) (*Service, *fakeStore, *fakeSessions) {
	t.Helper()
	store, sess := &fakeStore{}, newFakeSessions()
	svc := NewService(store, sess)
	resp, err := svc.SignUp(context.Background(), UserCreateReq{Name: "Ada", Email: "ada@example.com", Password: "harbor123"})
	if err != nil {
		t.Fatal(err)
	}
	if resp.Session.Token == "" {
		t.Fatal("sign-up returned no session token")
	}
	sess.users[store.created[0].Id] = store.created[0]
	return svc, store, sess
}

func TestSignIn(t *testing.T) {
	tests := []struct {
		name     string
		email    string
		password string
		wantErr  error
	}{
		{name: "valid", email: "ada@example.com", password: "harbor123"},
		{name: "email case and spaces ignored", email: "  ADA@example.com ", password: "harbor123"},
		{name: "wrong password", email: "ada@example.com", password: "harbor124", wantErr: ErrInvalidCredentials},
		{name: "unknown email", email: "nobody@example.com", password: "harbor123", wantErr: ErrInvalidCredentials},
		{name: "empty password", email: "ada@example.com", password: "", wantErr: ErrInvalidCredentials},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			svc, _, _ := signedUpService(t)
			resp, err := svc.SignIn(context.Background(), SignInReq{Email: tt.email, Password: tt.password})
			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				return
			}
			if resp.User.Email != "ada@example.com" || resp.Session.Token == "" {
				t.Errorf("unexpected response %+v", resp)
			}
			if got := resp.Session.ExpiresAt.Sub(time.Now()); got < SessionTTL-time.Minute || got > SessionTTL {
				t.Errorf("session expires in %v, want about %v", got, SessionTTL)
			}
		})
	}
}

func TestSignInWithoutPassword(t *testing.T) {
	store := &fakeStore{}
	store.created = append(store.created, signedUpUserWithoutPassword())
	_, err := NewService(store, newFakeSessions()).SignIn(context.Background(), SignInReq{Email: "oauth@example.com", Password: "harbor123"})
	if !errors.Is(err, ErrInvalidCredentials) {
		t.Fatalf("err = %v, want ErrInvalidCredentials", err)
	}
}

func TestSessionLifecycle(t *testing.T) {
	ctx := context.Background()
	svc, _, sess := signedUpService(t)

	resp, err := svc.SignIn(ctx, SignInReq{Email: "ada@example.com", Password: "harbor123"})
	if err != nil {
		t.Fatal(err)
	}
	for hash := range sess.rows {
		if hash == resp.Session.Token {
			t.Fatal("raw token stored instead of its hash")
		}
	}

	user, err := svc.CurrentUser(ctx, resp.Session.Token)
	if err != nil || user.Email != "ada@example.com" {
		t.Fatalf("CurrentUser = %+v, %v", user, err)
	}
	if _, err := svc.CurrentUser(ctx, "made-up-token"); !errors.Is(err, ErrUnauthenticated) {
		t.Errorf("unknown token: err = %v, want ErrUnauthenticated", err)
	}
	if _, err := svc.CurrentUser(ctx, ""); !errors.Is(err, ErrUnauthenticated) {
		t.Errorf("empty token: err = %v, want ErrUnauthenticated", err)
	}

	if err := svc.SignOut(ctx, resp.Session.Token); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.CurrentUser(ctx, resp.Session.Token); !errors.Is(err, ErrUnauthenticated) {
		t.Errorf("after sign-out: err = %v, want ErrUnauthenticated", err)
	}
	if err := svc.SignOut(ctx, resp.Session.Token); err != nil {
		t.Errorf("second sign-out: %v", err)
	}
}

func TestExpiredSession(t *testing.T) {
	ctx := context.Background()
	svc, _, sess := signedUpService(t)
	resp, err := svc.SignIn(ctx, SignInReq{Email: "ada@example.com", Password: "harbor123"})
	if err != nil {
		t.Fatal(err)
	}
	sess.now = func() time.Time { return time.Now().Add(SessionTTL + time.Minute) }
	if _, err := svc.CurrentUser(ctx, resp.Session.Token); !errors.Is(err, ErrUnauthenticated) {
		t.Fatalf("err = %v, want ErrUnauthenticated", err)
	}
}

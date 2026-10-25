package auth

import (
	"context"
	"errors"
	"hvnBff/internal/modules/users"
	"strings"
	"testing"
)

func TestAppSignUp(t *testing.T) {
	valid := UserCreateReq{Username: "ada-lovelace", Email: "ada@example.com", Password: "harbor123"}

	tests := []struct {
		name     string
		req      UserCreateReq
		storeErr error
		wantErr  error
	}{
		{name: "valid", req: valid},
		{name: "blank username", req: UserCreateReq{Username: " \t", Email: valid.Email, Password: valid.Password}, wantErr: ErrInvalidUsername},
		{name: "username too short", req: UserCreateReq{Username: "ad", Email: valid.Email, Password: valid.Password}, wantErr: ErrInvalidUsername},
		{name: "username too long", req: UserCreateReq{Username: strings.Repeat("a", 33), Email: valid.Email, Password: valid.Password}, wantErr: ErrInvalidUsername},
		{name: "username with space", req: UserCreateReq{Username: "ada lovelace", Email: valid.Email, Password: valid.Password}, wantErr: ErrInvalidUsername},
		{name: "username with underscore", req: UserCreateReq{Username: "ada_l", Email: valid.Email, Password: valid.Password}, wantErr: ErrInvalidUsername},
		{name: "username starting with hyphen", req: UserCreateReq{Username: "-ada", Email: valid.Email, Password: valid.Password}, wantErr: ErrInvalidUsername},
		{name: "username ending with hyphen", req: UserCreateReq{Username: "ada-", Email: valid.Email, Password: valid.Password}, wantErr: ErrInvalidUsername},
		{name: "username at 32 chars", req: UserCreateReq{Username: strings.Repeat("a", 32), Email: valid.Email, Password: valid.Password}},
		{name: "username taken", req: valid, storeErr: users.ErrUsernameTaken, wantErr: ErrUsernameTaken},
		{name: "blank email", req: UserCreateReq{Username: valid.Username, Email: "  ", Password: valid.Password}, wantErr: ErrInvalidEmail},
		{name: "invalid email", req: UserCreateReq{Username: valid.Username, Email: "not-an-email", Password: valid.Password}, wantErr: ErrInvalidEmail},
		{name: "display-name email", req: UserCreateReq{Username: valid.Username, Email: "Ada <ada@example.com>", Password: valid.Password}, wantErr: ErrInvalidEmail},
		{name: "short password", req: UserCreateReq{Username: valid.Username, Email: valid.Email, Password: "ab1"}, wantErr: ErrInvalidPassword},
		{name: "password without number", req: UserCreateReq{Username: valid.Username, Email: valid.Email, Password: "harborharbor"}, wantErr: ErrInvalidPassword},
		{name: "password without letter", req: UserCreateReq{Username: valid.Username, Email: valid.Email, Password: "12345678"}, wantErr: ErrInvalidPassword},
		{name: "password over 72 bytes", req: UserCreateReq{Username: valid.Username, Email: valid.Email, Password: "a1" + strings.Repeat("x", 71)}, wantErr: ErrInvalidPassword},
		{name: "email taken", req: valid, storeErr: users.ErrEmailTaken, wantErr: ErrEmailTaken},
		{name: "database failure", req: valid, storeErr: errors.New("connection refused"), wantErr: ErrCreateUser},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			store := &fakeStore{err: tt.storeErr}
			resp, err := NewService(store, newFakeSessions()).AppSignUp(context.Background(), tt.req)

			if !errors.Is(err, tt.wantErr) {
				t.Fatalf("err = %v, want %v", err, tt.wantErr)
			}
			if tt.wantErr != nil {
				if len(store.created) != 0 {
					t.Fatalf("stored a user on error: %+v", store.created)
				}
				return
			}
			if len(store.created) != 1 {
				t.Fatalf("stored %d users, want 1", len(store.created))
			}
			u := store.created[0]
			if u.Id == "" || resp.Id != u.Id {
				t.Errorf("id: stored %q, returned %q", u.Id, resp.Id)
			}
			if !CheckPassword(tt.req.Password, u.PasswordHash) {
				t.Error("stored hash does not match the password")
			}
		})
	}
}

func TestAppSignUpNormalisesInput(t *testing.T) {
	store := &fakeStore{}
	resp, err := NewService(store, newFakeSessions()).AppSignUp(context.Background(), UserCreateReq{
		Username: "  Ada-Lovelace \n", Email: " Ada@Example.COM ", Password: "harbor123",
	})
	if err != nil {
		t.Fatal(err)
	}
	u := store.created[0]
	if u.Username != "ada-lovelace" || u.Email != "ada@example.com" {
		t.Errorf("stored username %q, email %q", u.Username, u.Email)
	}
	if resp.Username != u.Username || resp.Email != u.Email {
		t.Errorf("response %+v does not match stored user", resp)
	}
}

func TestAppSignUpUniqueness(t *testing.T) {
	ctx := context.Background()
	svc := NewService(&fakeStore{}, newFakeSessions())
	if _, err := svc.AppSignUp(ctx, UserCreateReq{Username: "ada", Email: "ada@example.com", Password: "harbor123"}); err != nil {
		t.Fatal(err)
	}
	if _, err := svc.AppSignUp(ctx, UserCreateReq{Username: "ADA", Email: "other@example.com", Password: "harbor123"}); !errors.Is(err, ErrUsernameTaken) {
		t.Errorf("same username, other case: err = %v, want ErrUsernameTaken", err)
	}
	if _, err := svc.AppSignUp(ctx, UserCreateReq{Username: "grace", Email: "ada@example.com", Password: "harbor123"}); !errors.Is(err, ErrEmailTaken) {
		t.Errorf("same email: err = %v, want ErrEmailTaken", err)
	}
}

package auth

import (
	"context"
	"errors"
	"hvnBff/internal/modules/users"
	"strings"
	"testing"
)

func TestAppSignUp(t *testing.T) {
	valid := UserCreateReq{Name: "Ada Lovelace", Email: "ada@example.com", Password: "harbor123"}

	tests := []struct {
		name     string
		req      UserCreateReq
		storeErr error
		wantErr  error
	}{
		{name: "valid", req: valid},
		{name: "blank name", req: UserCreateReq{Name: " \t", Email: valid.Email, Password: valid.Password}, wantErr: ErrInvalidName},
		{name: "blank email", req: UserCreateReq{Name: valid.Name, Email: "  ", Password: valid.Password}, wantErr: ErrInvalidEmail},
		{name: "invalid email", req: UserCreateReq{Name: valid.Name, Email: "not-an-email", Password: valid.Password}, wantErr: ErrInvalidEmail},
		{name: "display-name email", req: UserCreateReq{Name: valid.Name, Email: "Ada <ada@example.com>", Password: valid.Password}, wantErr: ErrInvalidEmail},
		{name: "short password", req: UserCreateReq{Name: valid.Name, Email: valid.Email, Password: "ab1"}, wantErr: ErrInvalidPassword},
		{name: "password without number", req: UserCreateReq{Name: valid.Name, Email: valid.Email, Password: "harborharbor"}, wantErr: ErrInvalidPassword},
		{name: "password without letter", req: UserCreateReq{Name: valid.Name, Email: valid.Email, Password: "12345678"}, wantErr: ErrInvalidPassword},
		{name: "password over 72 bytes", req: UserCreateReq{Name: valid.Name, Email: valid.Email, Password: "a1" + strings.Repeat("x", 71)}, wantErr: ErrInvalidPassword},
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
		Name: "  Ada Lovelace \n", Email: " Ada@Example.COM ", Password: "harbor123",
	})
	if err != nil {
		t.Fatal(err)
	}
	u := store.created[0]
	if u.Name != "Ada Lovelace" || u.Email != "ada@example.com" {
		t.Errorf("stored name %q, email %q", u.Name, u.Email)
	}
	if resp.Name != u.Name || resp.Email != u.Email {
		t.Errorf("response %+v does not match stored user", resp)
	}
}

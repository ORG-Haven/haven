package sessions

import (
	"context"
	"errors"
	"fmt"
	"time"

	"hvnBff/internal/modules/users"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

var ErrNotFound = errors.New("session not found")

type Session struct {
	TokenHash string
	UserID    users.ID
	ExpiresAt time.Time
}

type Repository struct {
	pool *pgxpool.Pool
}

func NewRepository(pool *pgxpool.Pool) *Repository {
	return &Repository{pool: pool}
}

func (r *Repository) Create(ctx context.Context, s Session) error {
	_, err := r.pool.Exec(ctx,
		"INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, $3)",
		s.TokenHash, string(s.UserID), s.ExpiresAt,
	)
	if err != nil {
		return fmt.Errorf("insert session: %w", err)
	}
	return nil
}

// UserByToken returns the owner of an unexpired session.
func (r *Repository) UserByToken(ctx context.Context, tokenHash string) (users.User, error) {
	var u users.User
	err := r.pool.QueryRow(ctx, `
		SELECT u.id::text, u.username, u.email
		FROM sessions s JOIN users u ON u.id = s.user_id
		WHERE s.token_hash = $1 AND s.expires_at > now()`,
		tokenHash,
	).Scan(&u.Id, &u.Username, &u.Email)
	if errors.Is(err, pgx.ErrNoRows) {
		return users.User{}, ErrNotFound
	}
	if err != nil {
		return users.User{}, fmt.Errorf("get session user: %w", err)
	}
	return u, nil
}

func (r *Repository) Delete(ctx context.Context, tokenHash string) error {
	if _, err := r.pool.Exec(ctx, "DELETE FROM sessions WHERE token_hash = $1", tokenHash); err != nil {
		return fmt.Errorf("delete session: %w", err)
	}
	return nil
}

// DeleteExpired removes sessions past their expiry and reports how many went.
func (r *Repository) DeleteExpired(ctx context.Context) (int64, error) {
	tag, err := r.pool.Exec(ctx, "DELETE FROM sessions WHERE expires_at <= now()")
	if err != nil {
		return 0, fmt.Errorf("delete expired sessions: %w", err)
	}
	return tag.RowsAffected(), nil
}

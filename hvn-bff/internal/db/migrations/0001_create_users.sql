CREATE TABLE users (
    id         uuid PRIMARY KEY,
    name       text NOT NULL,
    email      text NOT NULL,
    created_at timestamptz NOT NULL DEFAULT now()
);

-- Emails are unique regardless of case.
CREATE UNIQUE INDEX users_email_key ON users (lower(email));

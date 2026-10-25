-- Accounts have a unique username instead of a display name. Usernames are stored lower
-- case (the BFF normalises them); the index also ignores case, like the email one.
ALTER TABLE users RENAME COLUMN name TO username;
CREATE UNIQUE INDEX users_username_key ON users (lower(username));

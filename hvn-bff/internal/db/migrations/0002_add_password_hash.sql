-- bcrypt hash of the user's password. Nullable: accounts created through
-- Google or GitHub sign-in have no password.
ALTER TABLE users ADD COLUMN password_hash text;

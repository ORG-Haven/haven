-- Fixed-window counters for rate limits, shared by every BFF replica.
-- key_hash is SHA-256 of the limited value (an IP address or an email), so the
-- table never holds them in the clear.
CREATE TABLE rate_limits (
    scope    text        NOT NULL,
    key_hash text        NOT NULL,
    count    integer     NOT NULL,
    reset_at timestamptz NOT NULL,
    PRIMARY KEY (scope, key_hash)
);

CREATE INDEX rate_limits_reset_at_idx ON rate_limits (reset_at);

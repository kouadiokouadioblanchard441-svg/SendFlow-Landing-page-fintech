CREATE TABLE IF NOT EXISTS rate_limit_buckets (
  bucket_key varchar(64) PRIMARY KEY,
  count integer NOT NULL,
  reset_at timestamptz NOT NULL
);

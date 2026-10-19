-- Apply after 0001_newsletter_double_opt_in.sql.
-- Nullable for existing rows; only new pending requests receive an expiry.
ALTER TABLE newsletter_subscribers
  ADD COLUMN confirmation_expires_at timestamptz;

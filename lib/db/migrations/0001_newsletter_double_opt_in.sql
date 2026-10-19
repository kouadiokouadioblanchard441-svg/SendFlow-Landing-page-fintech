-- Additive newsletter double-opt-in fields. Existing subscriber rows and campaign data are unchanged.
ALTER TABLE newsletter_subscribers
  ADD COLUMN confirmation_token varchar(80),
  ADD COLUMN consented_at timestamptz,
  ADD COLUMN consent_text_version varchar(32);

CREATE UNIQUE INDEX newsletter_subscribers_confirmation_token_unique
  ON newsletter_subscribers (confirmation_token);

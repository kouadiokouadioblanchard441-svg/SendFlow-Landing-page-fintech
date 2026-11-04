CREATE TABLE IF NOT EXISTS security_ip_blocks (
  ip_address varchar(45) PRIMARY KEY,
  blocked_by_telegram_user_id varchar(32) NOT NULL,
  blocked_at timestamptz NOT NULL DEFAULT now()
);

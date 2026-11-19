CREATE TABLE IF NOT EXISTS request_audit_events (
  id bigserial PRIMARY KEY,
  created_at timestamptz NOT NULL DEFAULT now(),
  method varchar(12) NOT NULL,
  route varchar(300) NOT NULL,
  status smallint NOT NULL,
  ip_address varchar(45),
  country_code varchar(2),
  country varchar(100),
  region varchar(100),
  city varchar(100),
  asn integer,
  network_organization varchar(180),
  isp varchar(180),
  connection_type varchar(80),
  mobile_country_code varchar(8),
  mobile_network_code varchar(8)
);

CREATE INDEX IF NOT EXISTS request_audit_events_created_at_idx
  ON request_audit_events (created_at DESC);

CREATE INDEX IF NOT EXISTS request_audit_events_ip_created_at_idx
  ON request_audit_events (ip_address, created_at DESC);

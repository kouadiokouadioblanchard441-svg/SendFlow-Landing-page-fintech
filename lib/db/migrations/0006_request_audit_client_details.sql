ALTER TABLE request_audit_events
  ADD COLUMN IF NOT EXISTS browser varchar(80),
  ADD COLUMN IF NOT EXISTS platform varchar(40),
  ADD COLUMN IF NOT EXISTS device varchar(40);

CREATE TABLE IF NOT EXISTS request_audit_visitors (
  ip_address varchar(45) PRIMARY KEY,
  first_seen timestamptz NOT NULL DEFAULT now(),
  last_seen timestamptz NOT NULL DEFAULT now(),
  country_code varchar(2),
  country varchar(100),
  region varchar(100),
  city varchar(100),
  asn integer,
  network_organization varchar(180),
  isp varchar(180),
  connection_type varchar(80),
  mobile_country_code varchar(8),
  mobile_network_code varchar(8),
  browser varchar(80),
  platform varchar(40),
  device varchar(40)
);

CREATE INDEX IF NOT EXISTS request_audit_visitors_last_seen_idx
  ON request_audit_visitors (last_seen DESC);

WITH visit_times AS (
  SELECT ip_address, MIN(created_at) AS first_seen, MAX(created_at) AS last_seen
  FROM request_audit_events
  WHERE ip_address IS NOT NULL
    AND created_at >= now() - interval '90 days'
  GROUP BY ip_address
),
latest_visit AS (
  SELECT DISTINCT ON (ip_address)
    ip_address, country_code, country, region, city, asn, network_organization,
    isp, connection_type, mobile_country_code, mobile_network_code, browser, platform, device
  FROM request_audit_events
  WHERE ip_address IS NOT NULL
    AND created_at >= now() - interval '90 days'
  ORDER BY ip_address, created_at DESC
)
INSERT INTO request_audit_visitors
  (ip_address, first_seen, last_seen, country_code, country, region, city, asn,
   network_organization, isp, connection_type, mobile_country_code, mobile_network_code,
   browser, platform, device)
SELECT latest_visit.ip_address, visit_times.first_seen, visit_times.last_seen,
  latest_visit.country_code, latest_visit.country, latest_visit.region, latest_visit.city,
  latest_visit.asn, latest_visit.network_organization, latest_visit.isp,
  latest_visit.connection_type, latest_visit.mobile_country_code,
  latest_visit.mobile_network_code, latest_visit.browser, latest_visit.platform,
  latest_visit.device
FROM latest_visit
JOIN visit_times USING (ip_address)
ON CONFLICT (ip_address) DO NOTHING;

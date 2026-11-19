import { pool } from "@workspace/db";
import { logger } from "./logger";
import type { ClientInfo } from "./clientInfo";
import type { GeoIpDetails } from "./geoIp";

export const REQUEST_AUDIT_RETENTION_DAYS = 90;
const RETENTION_INTERVAL_MS = 60 * 60 * 1_000;
const REQUEST_AUDIT_SCHEMA_SQL = `
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
    mobile_network_code varchar(8),
    browser varchar(80),
    platform varchar(40),
    device varchar(40)
  )
`;
const REQUEST_AUDIT_SCHEMA_UPGRADE_SQL = [
  "ALTER TABLE request_audit_events ADD COLUMN IF NOT EXISTS browser varchar(80)",
  "ALTER TABLE request_audit_events ADD COLUMN IF NOT EXISTS platform varchar(40)",
  "ALTER TABLE request_audit_events ADD COLUMN IF NOT EXISTS device varchar(40)",
  `CREATE TABLE IF NOT EXISTS request_audit_visitors (
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
  )`,
  `WITH visit_times AS (
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
   ON CONFLICT (ip_address) DO NOTHING`,
  "CREATE INDEX IF NOT EXISTS request_audit_visitors_last_seen_idx ON request_audit_visitors (last_seen DESC)",
];
const REQUEST_AUDIT_INDEX_SQL = [
  "CREATE INDEX IF NOT EXISTS request_audit_events_created_at_idx ON request_audit_events (created_at DESC)",
  "CREATE INDEX IF NOT EXISTS request_audit_events_ip_created_at_idx ON request_audit_events (ip_address, created_at DESC)",
];

export type NodeRequestAuditEvent = {
  method: string;
  route: string;
  status: number;
  ipAddress: string | null;
  geo: GeoIpDetails | null;
  clientInfo: ClientInfo;
};

export type RecentVisitor = {
  ip_address: string;
  country_code: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  asn: number | null;
  network_organization: string | null;
  isp: string | null;
  connection_type: string | null;
  mobile_country_code: string | null;
  mobile_network_code: string | null;
  browser: string | null;
  platform: string | null;
  device: string | null;
  first_seen: Date | string;
  last_seen: Date | string;
};

export type RecentRequest = {
  created_at: Date | string;
  method: string;
  route: string;
  status: number;
  ip_address: string | null;
  country: string | null;
  city: string | null;
  asn: number | null;
  network_organization: string | null;
  isp: string | null;
  connection_type: string | null;
  mobile_country_code: string | null;
  mobile_network_code: string | null;
  browser: string | null;
  platform: string | null;
  device: string | null;
};

let requestAuditStoreReady = false;
let cleanupTimer: NodeJS.Timeout | undefined;

export async function initializeRequestAuditStore(): Promise<void> {
  requestAuditStoreReady = false;
  await pool.query(REQUEST_AUDIT_SCHEMA_SQL);
  for (const statement of REQUEST_AUDIT_SCHEMA_UPGRADE_SQL) {
    await pool.query(statement);
  }
  for (const statement of REQUEST_AUDIT_INDEX_SQL) {
    await pool.query(statement);
  }
  await deleteExpiredRequestAudit();
  requestAuditStoreReady = true;
  if (!cleanupTimer) {
    cleanupTimer = setInterval(() => {
      void deleteExpiredRequestAudit();
    }, RETENTION_INTERVAL_MS);
    cleanupTimer.unref();
  }
}

export function isRequestAuditStoreReady(): boolean {
  return requestAuditStoreReady;
}

async function deleteExpiredRequestAudit(): Promise<void> {
  try {
    await pool.query(
      `DELETE FROM request_audit_events
       WHERE created_at < now() - interval '90 days'`,
    );
    await pool.query(
      `DELETE FROM request_audit_visitors
       WHERE last_seen < now() - interval '90 days'`,
    );
  } catch (error) {
    logger.warn({ err: error }, "Expired request audit records could not be removed.");
  }
}

export async function recordNodeRequest(event: NodeRequestAuditEvent): Promise<void> {
  if (!requestAuditStoreReady) return;
  const method = /^[A-Z]{1,12}$/.test(event.method) ? event.method : "OTHER";
  const route = event.route.startsWith("/") && event.route.length <= 300
    ? event.route
    : "/[redacted]";
  const status = Number.isInteger(event.status) && event.status >= 100 && event.status <= 599
    ? event.status
    : 500;

  try {
    await pool.query(
      `INSERT INTO request_audit_events
        (method, route, status, ip_address, country_code, country, region, city, asn,
         network_organization, isp, connection_type, mobile_country_code, mobile_network_code,
         browser, platform, device)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17)`,
      [
        method,
        route,
        status,
        event.ipAddress,
        event.geo?.countryCode ?? null,
        event.geo?.country ?? null,
        event.geo?.region ?? null,
        event.geo?.city ?? null,
        event.geo?.asn ?? null,
        event.geo?.networkOrganization ?? null,
        event.geo?.isp ?? null,
        event.geo?.connectionType ?? null,
        event.geo?.mobileCountryCode ?? null,
        event.geo?.mobileNetworkCode ?? null,
        event.clientInfo.browser,
        event.clientInfo.platform,
        event.clientInfo.device,
      ],
    );
  } catch (error) {
    logger.warn({ err: error }, "Node request audit record could not be stored.");
  }
}

export async function recordPageView(
  ipAddress: string | null,
  geo: GeoIpDetails | null,
  clientInfo: ClientInfo,
): Promise<boolean> {
  if (!requestAuditStoreReady || !ipAddress) return false;

  try {
    const inserted = await pool.query(
      `INSERT INTO request_audit_visitors
        (ip_address, country_code, country, region, city, asn, network_organization,
         isp, connection_type, mobile_country_code, mobile_network_code, browser, platform, device)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
       ON CONFLICT (ip_address) DO NOTHING
       RETURNING ip_address`,
      [
        ipAddress,
        geo?.countryCode ?? null,
        geo?.country ?? null,
        geo?.region ?? null,
        geo?.city ?? null,
        geo?.asn ?? null,
        geo?.networkOrganization ?? null,
        geo?.isp ?? null,
        geo?.connectionType ?? null,
        geo?.mobileCountryCode ?? null,
        geo?.mobileNetworkCode ?? null,
        clientInfo.browser,
        clientInfo.platform,
        clientInfo.device,
      ],
    );
    if (inserted.rowCount === 1) return true;

    await pool.query(
      `UPDATE request_audit_visitors
       SET last_seen = now(), country_code = $2, country = $3, region = $4, city = $5,
           asn = $6, network_organization = $7, isp = $8, connection_type = $9,
           mobile_country_code = $10, mobile_network_code = $11, browser = $12,
           platform = $13, device = $14
       WHERE ip_address = $1`,
      [
        ipAddress,
        geo?.countryCode ?? null,
        geo?.country ?? null,
        geo?.region ?? null,
        geo?.city ?? null,
        geo?.asn ?? null,
        geo?.networkOrganization ?? null,
        geo?.isp ?? null,
        geo?.connectionType ?? null,
        geo?.mobileCountryCode ?? null,
        geo?.mobileNetworkCode ?? null,
        clientInfo.browser,
        clientInfo.platform,
        clientInfo.device,
      ],
    );
    return false;
  } catch (error) {
    logger.warn({ err: error }, "Page view visitor details could not be stored.");
    return false;
  }
}

export async function listRecentVisitors(
  page: number,
  pageSize = 6,
): Promise<{ rows: RecentVisitor[]; total: number }> {
  const safePage = Math.max(1, Math.min(10_000, Math.floor(page)));
  const safePageSize = Math.max(1, Math.min(6, Math.floor(pageSize)));
  const offset = (safePage - 1) * safePageSize;
  const countResult = await pool.query(
    `SELECT COUNT(*)::integer AS total
     FROM request_audit_visitors
     WHERE last_seen >= now() - interval '90 days'`,
  );
  const rowsResult = await pool.query(
    `SELECT ip_address, country_code, country, region, city, asn, network_organization,
         isp, connection_type, mobile_country_code, mobile_network_code, browser, platform,
         device, first_seen, last_seen
      FROM request_audit_visitors
      WHERE last_seen >= now() - interval '90 days'
      ORDER BY last_seen DESC
     LIMIT $1 OFFSET $2`,
    [safePageSize, offset],
  );
  return {
    rows: rowsResult.rows as RecentVisitor[],
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

export async function listRecentRequests(
  page: number,
  pageSize = 6,
): Promise<{ rows: RecentRequest[]; total: number }> {
  const safePage = Math.max(1, Math.min(10_000, Math.floor(page)));
  const safePageSize = Math.max(1, Math.min(6, Math.floor(pageSize)));
  const offset = (safePage - 1) * safePageSize;
  const countResult = await pool.query(
    `SELECT COUNT(*)::integer AS total
     FROM request_audit_events
     WHERE created_at >= now() - interval '90 days'`,
  );
  const rowsResult = await pool.query(
     `SELECT created_at, method, route, status, ip_address, country, city, asn, network_organization,
         isp, connection_type, mobile_country_code, mobile_network_code, browser, platform, device
     FROM request_audit_events
     WHERE created_at >= now() - interval '90 days'
     ORDER BY id DESC
     LIMIT $1 OFFSET $2`,
    [safePageSize, offset],
  );
  return {
    rows: rowsResult.rows as RecentRequest[],
    total: Number(countResult.rows[0]?.total ?? 0),
  };
}

export function getRequestAuditSchemaForTest(): string {
  return [REQUEST_AUDIT_SCHEMA_SQL, ...REQUEST_AUDIT_SCHEMA_UPGRADE_SQL].join("\n");
}

export function resetRequestAuditStoreForTest(): void {
  requestAuditStoreReady = false;
  if (cleanupTimer) clearInterval(cleanupTimer);
  cleanupTimer = undefined;
}

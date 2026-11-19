import assert from "node:assert/strict";
import test from "node:test";
import type {
  AsnResponse,
  CityResponse,
  ConnectionTypeResponse,
  IspResponse,
  Reader,
} from "maxmind";

process.env.NEON_DATABASE_URL ??=
  "postgresql://offline-test:offline-test@127.0.0.1:1/sendflow";

const {
  formatAuditEvent,
  formatRequestReport,
  formatVisitorReport,
  parseTelegramAuditCommand,
} = await import("../src/lib/telegramAudit.ts");
const { parseClientInfo } = await import("../src/lib/clientInfo.ts");
const {
  lookupLocalGeoIp,
  resetGeoIpDatabasesForTest,
  setGeoIpReadersForTest,
} = await import("../src/lib/geoIp.ts");
const {
  getRequestAuditSchemaForTest,
  REQUEST_AUDIT_RETENTION_DAYS,
} = await import("../src/lib/requestAudit.ts");

test("visitor and request Telegram commands accept safe optional page numbers", () => {
  assert.deepEqual(parseTelegramAuditCommand("/visiteurs"), {
    command: "visiteurs",
    page: 1,
  });
  assert.deepEqual(parseTelegramAuditCommand("/visiteurs@SendFlowBot 3"), {
    command: "visiteurs",
    page: 3,
  });
  assert.deepEqual(parseTelegramAuditCommand("/requetes 100000"), {
    command: "requetes",
    page: 10_000,
  });
  assert.equal(parseTelegramAuditCommand("/start"), null);
  assert.equal(parseTelegramAuditCommand("/requetes 0"), null);
  assert.equal(parseTelegramAuditCommand("/visiteurs?token=private"), null);
});

test("local GeoIP lookup returns city, network, and mobile-carrier database fields", () => {
  const cityDatabaseRecord: CityResponse = {
    country: {
      geoname_id: 1,
      iso_code: "CI",
      names: { en: "Ivory Coast", fr: "Côte d’Ivoire" },
    },
    traits: { connection_type: "Cellular" },
    city: {
      geoname_id: 2,
      names: { en: "Abidjan", fr: "Abidjan" },
    },
    subdivisions: [{
      geoname_id: 3,
      iso_code: "AB",
      names: { en: "Abidjan District", fr: "District d’Abidjan" },
    }],
  };
  const asnDatabaseRecord: AsnResponse = {
    autonomous_system_number: 12345,
    autonomous_system_organization: "Example Mobile Network",
  };
  const ispDatabaseRecord: IspResponse = {
    autonomous_system_number: 12345,
    autonomous_system_organization: "Example Mobile Network",
    isp: "Example Mobile",
    organization: "Example Mobile Group",
    mobile_country_code: "612",
    mobile_network_code: "03",
  };
  const connectionDatabaseRecord: ConnectionTypeResponse = {
    connection_type: "Cellular",
  };
  setGeoIpReadersForTest(
    { get: () => cityDatabaseRecord } as unknown as Reader<CityResponse>,
    { get: () => asnDatabaseRecord } as unknown as Reader<AsnResponse>,
    { get: () => ispDatabaseRecord } as unknown as Reader<IspResponse>,
    { get: () => connectionDatabaseRecord } as unknown as Reader<ConnectionTypeResponse>,
  );
  try {
    assert.deepEqual(lookupLocalGeoIp("8.8.8.8"), {
      countryCode: "CI",
      country: "Côte d’Ivoire",
      region: "District d’Abidjan",
      city: "Abidjan",
      asn: 12345,
      networkOrganization: "Example Mobile Network",
      isp: "Example Mobile",
      connectionType: "Cellular",
      mobileCountryCode: "612",
      mobileNetworkCode: "03",
    });
    assert.equal(lookupLocalGeoIp(null), null);
  } finally {
    resetGeoIpDatabasesForTest();
  }
});

test("client details are normalized from the server request header without storing raw user-agent", () => {
  assert.deepEqual(
    parseClientInfo(
      "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/130.0.0.0 Mobile Safari/537.36",
    ),
    { browser: "Chrome", platform: "Android", device: "Mobile" },
  );
  assert.deepEqual(
    parseClientInfo("Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Version/17.0 Mobile/15E148 Safari/604.1"),
    { browser: "Safari", platform: "iOS", device: "Tablette" },
  );
  assert.deepEqual(parseClientInfo(undefined), {
    browser: null,
    platform: null,
    device: null,
  });
  assert.deepEqual(
    parseClientInfo("Mozilla/5.0 Googlebot/2.1 (+http://www.google.com/bot.html)"),
    { browser: "Bot (Googlebot)", platform: null, device: "Bot" },
  );
});

test("Telegram request reports are bounded and do not include request payloads", () => {
  const visitorReport = formatVisitorReport([
    {
      ip_address: "8.8.8.8",
      country_code: "CI",
      country: "Côte d’Ivoire",
      region: null,
      city: "Abidjan",
      asn: 12345,
      network_organization: "Example ASN",
      isp: "Example Mobile",
      connection_type: "Cellular",
      mobile_country_code: "612",
      mobile_network_code: "03",
      browser: "Chrome",
      platform: "Android",
      device: "Mobile",
      first_seen: "2026-11-18T08:00:00.000Z",
      last_seen: "2026-11-19T10:00:00.000Z",
    },
  ], 1, 1);
  assert.match(visitorReport, /8\.8\.8\.8/);
  assert.match(visitorReport, /Abidjan/);
  assert.match(visitorReport, /Example Mobile/);
  assert.match(visitorReport, /Cellular/);
  assert.match(visitorReport, /90 jours/);

  const requestReport = formatRequestReport([
    {
      created_at: "2026-11-19T10:00:00.000Z",
      method: "POST",
      route: "/api/newsletter",
      status: 202,
      ip_address: "8.8.8.8",
      country: "Côte d’Ivoire",
      city: "Abidjan",
      asn: 12345,
      network_organization: "Example ASN",
      isp: "Example Mobile",
      connection_type: "Cellular",
      mobile_country_code: "612",
      mobile_network_code: "03",
      browser: "Chrome",
      platform: "Android",
      device: "Mobile",
    },
  ], 1, 1);
  assert.match(requestReport, /POST \/api\/newsletter/);
  assert.match(requestReport, /202/);
  assert.match(requestReport, /Example Mobile/);
  assert.match(requestReport, /Cellular/);
  assert.match(requestReport, /Chrome/);
  assert.match(requestReport, /Mobile/);
  assert.doesNotMatch(requestReport, /email|password|cookie|body/i);
  assert.equal(REQUEST_AUDIT_RETENTION_DAYS, 90);

  const schema = getRequestAuditSchemaForTest();
  assert.match(schema, /CREATE TABLE IF NOT EXISTS request_audit_events/);
  assert.match(schema, /ip_address varchar\(45\)/);
  assert.match(schema, /browser varchar\(80\)/);
  assert.match(schema, /CREATE TABLE IF NOT EXISTS request_audit_visitors/);
  assert.match(schema, /first_seen timestamptz/);
  assert.doesNotMatch(schema, /user_agent varchar/i);
  assert.doesNotMatch(schema, /request_body|cookie|authorization/i);
});

test("new public page visits format a first-seen notice with server-derived details", () => {
  const message = formatAuditEvent({
    kind: "page_view",
    page: "/",
    ip: "41.138.89.238",
    city: "Cotonou",
    country: "Benin",
    isp: "Example ISP",
    browser: "Chrome",
    platform: "Android",
    device: "Mobile",
    occurredAt: "2026-11-08T13:19:29.000Z",
    isNewVisitor: true,
  });
  assert.match(message, /🆕 Nouvelle IP/);
  assert.match(message, /41\.138\.89\.238/);
  assert.match(message, /Cotonou, Benin/);
  assert.match(message, /Example ISP/);
  assert.match(message, /Chrome \(Android\)/);
  assert.match(message, /Mobile/);
  assert.match(message, /08 novembre 2026 à 13:19:29 UTC/);
  assert.match(message, /90 jours/);
  assert.doesNotMatch(message, /compte/i);
});

test("every HTTP request message shows the IP and visitor details in the requested format", () => {
  const message = formatAuditEvent({
    kind: "http_request",
    method: "POST",
    page: "/newsletter/subscribe",
    status: 503,
    ip: "41.138.89.238",
    city: "Cotonou",
    country: "Benin",
    isp: "Example Mobile Network",
    connectionType: "Cellular",
    browser: "Chrome",
    platform: "Android",
    device: "Mobile",
    occurredAt: "2026-11-08T13:19:29.000Z",
  });
  assert.match(message, /📡 Requête HTTP — POST \/newsletter\/subscribe/);
  assert.match(message, /HTTP 503/);
  assert.match(message, /🌐 Adresse IP : 41\.138\.89\.238/);
  assert.match(message, /📍 Localisation : Cotonou, Benin/);
  assert.match(message, /🏢 FAI : Example Mobile Network/);
  assert.match(message, /📶 Type de réseau : Cellular/);
  assert.match(message, /💻 Navigateur déclaré : Chrome \(Android\)/);
  assert.match(message, /📱 Appareil estimé : Mobile/);
  assert.match(message, /🕒 Date : 08 novembre 2026 à 13:19:29 UTC/);
});

test("security request alerts include metadata and never invent an IP", () => {
  const message = formatAuditEvent({
    kind: "security",
    method: "GET",
    page: "/.env",
    status: 404,
    ip: null,
    occurredAt: "2026-11-08T13:19:29.000Z",
  });
  assert.match(message, /⚠️ Requête à surveiller — GET \/.env/);
  assert.match(message, /HTTP 404/);
  assert.match(message, /IP indisponible — Node ne reçoit pas d’adresse publique fiable via Plesk/);
  assert.doesNotMatch(message, /203\.0\.113\.|198\.51\.100\./);
});

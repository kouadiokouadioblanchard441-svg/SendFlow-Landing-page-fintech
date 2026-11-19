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
  formatRequestReport,
  formatVisitorReport,
  parseTelegramAuditCommand,
} = await import("../src/lib/telegramAudit.ts");
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
    },
  ], 1, 1);
  assert.match(requestReport, /POST \/api\/newsletter/);
  assert.match(requestReport, /202/);
  assert.match(requestReport, /Example Mobile/);
  assert.match(requestReport, /Cellular/);
  assert.doesNotMatch(requestReport, /email|password|cookie|body/i);
  assert.equal(REQUEST_AUDIT_RETENTION_DAYS, 90);

  const schema = getRequestAuditSchemaForTest();
  assert.match(schema, /CREATE TABLE IF NOT EXISTS request_audit_events/);
  assert.match(schema, /ip_address varchar\(45\)/);
  assert.doesNotMatch(schema, /request_body|cookie|authorization/i);
});

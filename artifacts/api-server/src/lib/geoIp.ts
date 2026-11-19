import path from "node:path";
import maxmind, {
  type AsnResponse,
  type CityResponse,
  type ConnectionTypeResponse,
  type IspResponse,
  type Reader,
} from "maxmind";
import { getPleskMediaDirectory } from "./publicObjectStorage";
import { logger } from "./logger";

export type GeoIpDetails = {
  countryCode: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  asn: number | null;
  networkOrganization: string | null;
  isp: string | null;
  connectionType: string | null;
  mobileCountryCode: string | null;
  mobileNetworkCode: string | null;
};

let cityReader: Reader<CityResponse> | null = null;
let asnReader: Reader<AsnResponse> | null = null;
let ispReader: Reader<IspResponse> | null = null;
let connectionTypeReader: Reader<ConnectionTypeResponse> | null = null;
let initialized = false;

function safeLabel(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = value
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
  return cleaned || null;
}

export async function initializeGeoIpDatabases(): Promise<void> {
  if (initialized) return;
  initialized = true;
  const mediaDirectory = getPleskMediaDirectory();
  if (!mediaDirectory) {
    logger.warn("Local GeoIP lookup is unavailable because PLESK_MEDIA_DIR is not configured.");
    return;
  }

  const geoIpDirectory = path.join(mediaDirectory, "geoip");
  const cityPath = path.join(geoIpDirectory, "GeoLite2-City.mmdb");
  const asnPath = path.join(geoIpDirectory, "GeoLite2-ASN.mmdb");
  const ispPath = path.join(geoIpDirectory, "GeoIP2-ISP.mmdb");
  const connectionTypePath = path.join(geoIpDirectory, "GeoIP2-Connection-Type.mmdb");

  try {
    cityReader = await maxmind.open<CityResponse>(cityPath);
  } catch {
    logger.warn(
      { database: "GeoLite2-City.mmdb" },
      "Local GeoIP city database is unavailable; city and country details will be omitted.",
    );
  }

  try {
    asnReader = await maxmind.open<AsnResponse>(asnPath);
  } catch {
    logger.warn(
      { database: "GeoLite2-ASN.mmdb" },
      "Local GeoIP ASN database is unavailable; network organization details will be omitted.",
    );
  }

  try {
    ispReader = await maxmind.open<IspResponse>(ispPath);
  } catch {
    logger.warn(
      { database: "GeoIP2-ISP.mmdb" },
      "Local GeoIP ISP database is unavailable; ISP and mobile-network details will be omitted.",
    );
  }

  try {
    connectionTypeReader = await maxmind.open<ConnectionTypeResponse>(connectionTypePath);
  } catch {
    logger.warn(
      { database: "GeoIP2-Connection-Type.mmdb" },
      "Local GeoIP connection-type database is unavailable; connection type will be omitted.",
    );
  }
}

export function lookupLocalGeoIp(ipAddress: string | null): GeoIpDetails | null {
  if (!ipAddress) return null;
  const city = cityReader?.get(ipAddress) ?? null;
  const asnRecord = asnReader?.get(ipAddress) ?? null;
  const ispRecord = ispReader?.get(ipAddress) ?? null;
  const connectionTypeRecord = connectionTypeReader?.get(ipAddress) ?? null;
  if (!city && !asnRecord && !ispRecord && !connectionTypeRecord) return null;

  const country = city?.country;
  const subdivision = city?.subdivisions?.[0];
  const cityRecord = city?.city;
  return {
    countryCode: safeLabel(country?.iso_code, 2),
    country: safeLabel(country?.names?.fr ?? country?.names?.en, 100),
    region: safeLabel(subdivision?.names?.fr ?? subdivision?.names?.en, 100),
    city: safeLabel(cityRecord?.names?.fr ?? cityRecord?.names?.en, 100),
    asn: typeof asnRecord?.autonomous_system_number === "number"
      ? asnRecord.autonomous_system_number
      : (typeof city?.traits?.autonomous_system_number === "number"
        ? city.traits.autonomous_system_number
        : null),
    networkOrganization: safeLabel(
      asnRecord?.autonomous_system_organization ??
        ispRecord?.organization ??
        ispRecord?.isp ??
        city?.traits?.autonomous_system_organization ??
        city?.traits?.organization ??
        city?.traits?.isp,
      180,
    ),
    isp: safeLabel(ispRecord?.isp ?? null, 180),
    connectionType: safeLabel(
      connectionTypeRecord?.connection_type ?? city?.traits?.connection_type ?? null,
      80,
    ),
    mobileCountryCode: safeLabel(ispRecord?.mobile_country_code ?? null, 8),
    mobileNetworkCode: safeLabel(ispRecord?.mobile_network_code ?? null, 8),
  };
}

export function resetGeoIpDatabasesForTest(): void {
  cityReader = null;
  asnReader = null;
  ispReader = null;
  connectionTypeReader = null;
  initialized = false;
}

export function setGeoIpReadersForTest(
  city: Reader<CityResponse> | null,
  asn: Reader<AsnResponse> | null,
  isp: Reader<IspResponse> | null = null,
  connectionType: Reader<ConnectionTypeResponse> | null = null,
): void {
  cityReader = city;
  asnReader = asn;
  ispReader = isp;
  connectionTypeReader = connectionType;
  initialized = true;
}

import { bigserial, index, integer, pgTable, smallint, timestamp, varchar } from "drizzle-orm/pg-core";

export const securityIpBlocks = pgTable("security_ip_blocks", {
  ipAddress: varchar("ip_address", { length: 45 }).primaryKey(),
  blockedByTelegramUserId: varchar("blocked_by_telegram_user_id", { length: 32 }).notNull(),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SecurityIpBlock = typeof securityIpBlocks.$inferSelect;

export const requestAuditEvents = pgTable(
  "request_audit_events",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    method: varchar("method", { length: 12 }).notNull(),
    route: varchar("route", { length: 300 }).notNull(),
    status: smallint("status").notNull(),
    ipAddress: varchar("ip_address", { length: 45 }),
    countryCode: varchar("country_code", { length: 2 }),
    country: varchar("country", { length: 100 }),
    region: varchar("region", { length: 100 }),
    city: varchar("city", { length: 100 }),
    asn: integer("asn"),
    networkOrganization: varchar("network_organization", { length: 180 }),
    isp: varchar("isp", { length: 180 }),
    connectionType: varchar("connection_type", { length: 80 }),
    mobileCountryCode: varchar("mobile_country_code", { length: 8 }),
    mobileNetworkCode: varchar("mobile_network_code", { length: 8 }),
    browser: varchar("browser", { length: 80 }),
    platform: varchar("platform", { length: 40 }),
    device: varchar("device", { length: 40 }),
  },
  (table) => [
    index("request_audit_events_created_at_idx").on(table.createdAt),
    index("request_audit_events_ip_created_at_idx").on(table.ipAddress, table.createdAt),
  ],
);

export type RequestAuditEvent = typeof requestAuditEvents.$inferSelect;

export const requestAuditVisitors = pgTable(
  "request_audit_visitors",
  {
    ipAddress: varchar("ip_address", { length: 45 }).primaryKey(),
    firstSeen: timestamp("first_seen", { withTimezone: true }).notNull().defaultNow(),
    lastSeen: timestamp("last_seen", { withTimezone: true }).notNull().defaultNow(),
    countryCode: varchar("country_code", { length: 2 }),
    country: varchar("country", { length: 100 }),
    region: varchar("region", { length: 100 }),
    city: varchar("city", { length: 100 }),
    asn: integer("asn"),
    networkOrganization: varchar("network_organization", { length: 180 }),
    isp: varchar("isp", { length: 180 }),
    connectionType: varchar("connection_type", { length: 80 }),
    mobileCountryCode: varchar("mobile_country_code", { length: 8 }),
    mobileNetworkCode: varchar("mobile_network_code", { length: 8 }),
    browser: varchar("browser", { length: 80 }),
    platform: varchar("platform", { length: 40 }),
    device: varchar("device", { length: 40 }),
  },
  (table) => [
    index("request_audit_visitors_last_seen_idx").on(table.lastSeen),
  ],
);

export type RequestAuditVisitor = typeof requestAuditVisitors.$inferSelect;

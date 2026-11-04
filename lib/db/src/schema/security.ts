import { pgTable, timestamp, varchar } from "drizzle-orm/pg-core";

export const securityIpBlocks = pgTable("security_ip_blocks", {
  ipAddress: varchar("ip_address", { length: 45 }).primaryKey(),
  blockedByTelegramUserId: varchar("blocked_by_telegram_user_id", { length: 32 }).notNull(),
  blockedAt: timestamp("blocked_at", { withTimezone: true }).notNull().defaultNow(),
});

export type SecurityIpBlock = typeof securityIpBlocks.$inferSelect;

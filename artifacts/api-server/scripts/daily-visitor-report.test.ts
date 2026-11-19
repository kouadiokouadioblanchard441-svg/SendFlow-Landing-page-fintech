import assert from "node:assert/strict";
import test from "node:test";

process.env.NEON_DATABASE_URL ??=
  "postgresql://offline-test:offline-test@127.0.0.1:1/sendflow";

const {
  formatDailyVisitorReport,
  previousUtcDate,
  utcDateRange,
} = await import("../src/lib/dailyVisitorReport.ts");

test("daily visitor reporting uses the previous UTC calendar day", () => {
  assert.equal(previousUtcDate(new Date("2026-11-20T00:00:02.000Z")), "2026-11-19");
  assert.equal(previousUtcDate(new Date("2027-01-01T00:00:00.000Z")), "2026-12-31");
  assert.deepEqual(utcDateRange("2026-11-19"), {
    start: new Date("2026-11-19T00:00:00.000Z"),
    end: new Date("2026-11-20T00:00:00.000Z"),
  });
  assert.throws(() => utcDateRange("19-11-2026"), /YYYY-MM-DD/);
  assert.throws(() => utcDateRange("2026-02-30"), /invalid/);
});

test("daily report summarizes views and lists each known IP with concise details", () => {
  const messages = formatDailyVisitorReport("2026-11-19", {
    totalViews: 4,
    uniqueIpCount: 2,
    unknownIpViews: 1,
    visitors: [
      {
        ip_address: "41.138.89.238",
        city: "Cotonou",
        country: "Benin",
        network_organization: "Gprs-edge Usage",
        isp: null,
        browser: "Chrome",
        platform: "Android",
        device: "Mobile",
        page: "/",
      },
      {
        ip_address: "8.8.8.8",
        city: "Abidjan",
        country: "Côte d’Ivoire",
        network_organization: null,
        isp: "Example Network",
        browser: "Firefox",
        platform: "Linux",
        device: "Ordinateur",
        page: "/documentation",
      },
    ],
  });

  assert.equal(messages.length, 2);
  assert.match(messages[0], /Bilan SendFlow — 19 novembre 2026 \(UTC\)/);
  assert.match(messages[0], /Visites de pages : 4/);
  assert.match(messages[0], /IP distinctes : 2/);
  assert.match(messages[0], /Visites sans IP fiable : 1/);
  assert.match(messages[1], /41\.138\.89\.238 · Cotonou, Benin · Gprs-edge Usage/);
  assert.match(messages[1], /8\.8\.8\.8 · Abidjan, Côte d’Ivoire · Example Network/);
  assert.match(messages[1], /\/documentation/);
  assert.ok(messages.every((message) => message.length <= 3_500));
});

test("large daily visitor lists are split into Telegram-sized messages", () => {
  const visitors = Array.from({ length: 60 }, (_, index) => ({
    ip_address: `41.138.89.${index + 1}`,
    city: `City ${index}`,
    country: "Benin",
    network_organization: "Example mobile network",
    isp: null,
    browser: "Chrome",
    platform: "Android",
    device: "Mobile",
    page: "/",
  }));
  const messages = formatDailyVisitorReport("2026-11-19", {
    totalViews: 30,
    uniqueIpCount: 30,
    unknownIpViews: 0,
    visitors,
  });

  assert.ok(messages.length > 2);
  assert.ok(messages.every((message) => message.length <= 3_500));
  for (const visitor of visitors) {
    assert.ok(messages.some((message) => message.includes(visitor.ip_address)));
  }
});

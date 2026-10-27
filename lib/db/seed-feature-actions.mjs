import pg from "pg";
import { featureActionContent } from "./feature-action-content.mjs";

const { Pool } = pg;
const connectionString = process.env.NEON_DATABASE_URL;

if (!connectionString) {
  throw new Error("NEON_DATABASE_URL must be set");
}

const pool = new Pool({ connectionString });

try {
  let inserted = 0;

  for (const [contentKey, group, fr, en] of featureActionContent) {
    for (const [locale, value] of [["fr", fr], ["en", en]]) {
      const result = await pool.query(
        `INSERT INTO landing_content (content_key, locale, "group", value)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (content_key, locale) DO NOTHING`,
        [contentKey, locale, group, value],
      );
      inserted += result.rowCount ?? 0;
    }
  }

  console.log(`Added ${inserted} missing feature-card translations; existing admin edits were preserved.`);
} finally {
  await pool.end();
}

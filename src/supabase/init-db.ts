/**
 * Run this script with: bun run src/supabase/init-db.ts
 *
 * It reads init-db.sql and executes it against the Supabase database
 * using the Management API (SQL endpoint via supabase-js rpc or REST).
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));

const SUPABASE_URL = "https://hkjwwsmoqtsyhdytfujf.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.sb_publishable_-icS-J7RIum0DN_JPEo7HA_0IVHF1Nv";

async function main() {
  const sqlPath = resolve(__dirname, "init-db.sql");
  const sql = readFileSync(sqlPath, "utf-8");

  // Split SQL into individual statements to execute them one by one
  // via the Supabase REST SQL endpoint (postgrest doesn't support raw SQL,
  // so we use the rpc endpoint if available, otherwise use the pg REST API)

  // Use the Supabase SQL API endpoint
  const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!response.ok) {
    // The REST rpc endpoint won't work for raw DDL.
    // We need to use the Supabase Management API or the SQL Editor API.
    // Let's try an alternative approach using the pg-meta endpoint.
    console.log(
      "Direct RPC not available. Attempting via Supabase SQL query endpoint...",
    );

    const sqlResponse = await fetch(`${SUPABASE_URL}/pg/query`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ query: sql }),
    });

    if (!sqlResponse.ok) {
      const text = await sqlResponse.text();
      console.error("Failed to execute SQL:", sqlResponse.status, text);
      console.log("\n--- MANUAL SETUP REQUIRED ---");
      console.log(
        "Copy the contents of init-db.sql and run it in the Supabase SQL Editor:",
      );
      console.log(`  ${SUPABASE_URL} → SQL Editor → New Query → Paste & Run`);
      process.exit(1);
    }

    const result = await sqlResponse.json();
    console.log("SQL executed successfully:", result);
  } else {
    const result = await response.json();
    console.log("SQL executed successfully:", result);
  }
}

main().catch(console.error);

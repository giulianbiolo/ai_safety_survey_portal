/**
 * Helper to surface the canonical schema for manual application.
 *
 * Run with: `bun run src/supabase/init-db.ts`
 *
 * The SQL contains DDL plus SECURITY DEFINER functions, which the anon
 * publishable key cannot execute. Apply it via the Supabase SQL Editor
 * (or `supabase db push` from the CLI) using a service-role credential.
 *
 * Previously this file shipped with hardcoded credentials and a fetch-based
 * REST path that never worked (PostgREST doesn't accept raw DDL); both
 * have been removed.
 */

import { readFileSync } from "fs";
import { resolve, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const sqlPath = resolve(__dirname, "init-db.sql");
const sql = readFileSync(sqlPath, "utf-8");

const projectUrl = process.env.VITE_SUPABASE_URL ?? "<your-project>";

console.log("# Supabase DB initialization");
console.log("#");
console.log(`# Open the SQL Editor at: ${projectUrl}`);
console.log("# Paste the SQL below and run it once. The script is idempotent:");
console.log("# CREATE TABLE IF NOT EXISTS, DROP POLICY IF EXISTS, CREATE OR REPLACE FUNCTION.");
console.log("#");
console.log("# Required role: service_role (the anon role cannot execute DDL or SECURITY DEFINER).");
console.log();
console.log(sql);

/**
 * Apply a SQL migration file against the remote Supabase Postgres DB.
 *
 * Requires one of:
 *   DATABASE_URL=postgresql://postgres:...@db.<ref>.supabase.co:5432/postgres
 *   SUPABASE_DB_PASSWORD=...  (uses NEXT_PUBLIC_SUPABASE_URL project ref)
 *
 * Usage:
 *   node scripts/apply-migration.mjs supabase/migrations/20260922120000_recruiter_candidate_meta.sql
 */
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

function loadEnv() {
  const envPath = resolve(process.cwd(), '.env');
  if (!existsSync(envPath)) return;
  for (const line of readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const m = line.match(/^\s*([^#=\s]+)\s*=\s*(.*)$/);
    if (!m) continue;
    const key = m[1];
    let val = m[2].trim();
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1);
    }
    if (!process.env[key]) process.env[key] = val;
  }
}

function projectRefFromUrl(url) {
  try {
    const host = new URL(url).hostname; // izyemqmgeyzpodagyjzg.supabase.co
    return host.split('.')[0];
  } catch {
    return null;
  }
}

async function applyWithPostgres(connectionString, sql) {
  const { default: postgres } = await import('postgres');
  const sqlClient = postgres(connectionString, { max: 1, idle_timeout: 5, connect_timeout: 15 });
  try {
    await sqlClient.unsafe(sql);
  } finally {
    await sqlClient.end({ timeout: 5 });
  }
}

async function main() {
  loadEnv();
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: node scripts/apply-migration.mjs <path-to.sql>');
    process.exit(1);
  }
  const sqlPath = resolve(process.cwd(), file);
  if (!existsSync(sqlPath)) {
    console.error('File not found:', sqlPath);
    process.exit(1);
  }
  const sql = readFileSync(sqlPath, 'utf8');

  let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  if (!connectionString) {
    const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
    const ref = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    if (password && ref) {
      connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
    }
  }

  if (!connectionString) {
    console.error(
      'Cannot apply migration: set DATABASE_URL or SUPABASE_DB_PASSWORD in .env\n' +
        '(Supabase Dashboard → Project Settings → Database → Database password)',
    );
    process.exit(2);
  }

  console.log('Applying', file, '…');
  try {
    await applyWithPostgres(connectionString, sql);
    console.log('OK: migration applied');
  } catch (err) {
    if (err?.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find package 'postgres'/.test(String(err))) {
      console.error('Install the postgres client: npm install postgres --save-dev');
      process.exit(3);
    }
    console.error('Migration failed:', err?.message || err);
    process.exit(4);
  }
}

main();

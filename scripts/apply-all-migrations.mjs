/**
 * Apply all SQL migrations in supabase/migrations/ in filename order.
 *
 * Requires DATABASE_URL or SUPABASE_DB_PASSWORD in .env
 * (Supabase Dashboard → Project Settings → Database → Database password)
 *
 * Usage:
 *   node scripts/apply-all-migrations.mjs
 *   node scripts/apply-all-migrations.mjs --from 20260924100000
 *   node scripts/apply-all-migrations.mjs --dry-run
 */
import { readFileSync, existsSync, readdirSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, join } from 'path';

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
    return new URL(url).hostname.split('.')[0];
  } catch {
    return null;
  }
}

function getConnectionString() {
  let connectionString = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL || '';
  if (!connectionString) {
    const password = process.env.SUPABASE_DB_PASSWORD || process.env.POSTGRES_PASSWORD;
    const ref = projectRefFromUrl(process.env.NEXT_PUBLIC_SUPABASE_URL || '');
    if (password && ref) {
      connectionString = `postgresql://postgres:${encodeURIComponent(password)}@db.${ref}.supabase.co:5432/postgres`;
    }
  }
  return connectionString;
}

function listMigrations(fromPrefix) {
  const dir = resolve(process.cwd(), 'supabase/migrations');
  let files = readdirSync(dir)
    .filter((f) => f.endsWith('.sql'))
    .sort();
  if (fromPrefix) {
    files = files.filter((f) => f >= fromPrefix);
  }
  return files.map((f) => join(dir, f));
}

async function main() {
  loadEnv();
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const fromIdx = args.indexOf('--from');
  const fromPrefix = fromIdx >= 0 ? args[fromIdx + 1] : null;

  const files = listMigrations(fromPrefix);
  console.log(`Found ${files.length} migration(s)${fromPrefix ? ` from ${fromPrefix}` : ''}`);
  if (dryRun) {
    for (const f of files) console.log('  ', f.replace(/\\/g, '/').split('/supabase/')[1] || f);
    process.exit(0);
  }

  const connectionString = getConnectionString();
  if (!connectionString) {
    console.error(
      'Cannot apply migrations: set DATABASE_URL or SUPABASE_DB_PASSWORD in .env\n' +
        '(Supabase Dashboard → Project Settings → Database → Database password)',
    );
    process.exit(2);
  }

  let postgres;
  try {
    ({ default: postgres } = await import('postgres'));
  } catch {
    console.error('Install the postgres client: npm install postgres --save-dev');
    process.exit(3);
  }

  // Prefer session mode / direct; disable prepare for PgBouncer transaction mode if used
  const sqlClient = postgres(connectionString, {
    max: 1,
    idle_timeout: 5,
    connect_timeout: 20,
    ssl: 'require',
    prepare: false,
  });

  const stateDir = resolve(process.cwd(), '.migration-state');
  mkdirSync(stateDir, { recursive: true });
  const logPath = join(stateDir, 'apply-log.jsonl');

  // Ensure tracking table exists
  await sqlClient.unsafe(`
    CREATE TABLE IF NOT EXISTS public.schema_migrations_applied (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  `);

  const applied = new Set(
    (await sqlClient`SELECT filename FROM public.schema_migrations_applied`).map((r) => r.filename),
  );

  let ok = 0;
  let skipped = 0;
  let failed = 0;

  try {
    for (const fullPath of files) {
      const filename = fullPath.split(/[/\\]/).pop();
      if (applied.has(filename)) {
        console.log(`SKIP (already applied): ${filename}`);
        skipped++;
        continue;
      }
      const sql = readFileSync(fullPath, 'utf8');
      console.log(`APPLY: ${filename} …`);
      try {
        await sqlClient.begin(async (tx) => {
          await tx.unsafe(sql);
          await tx`
            INSERT INTO public.schema_migrations_applied (filename)
            VALUES (${filename})
            ON CONFLICT (filename) DO NOTHING
          `;
        });
        console.log(`OK: ${filename}`);
        writeFileSync(
          logPath,
          JSON.stringify({ at: new Date().toISOString(), filename, status: 'ok' }) + '\n',
          { flag: 'a' },
        );
        ok++;
      } catch (err) {
        const msg = err?.message || String(err);
        // Idempotent-ish: already exists objects — record as applied if table already there
        const benign =
          /already exists/i.test(msg) ||
          /duplicate key/i.test(msg) ||
          /does not exist, skipping/i.test(msg);
        if (benign) {
          console.warn(`WARN (continuing, marking applied): ${filename}\n  ${msg.slice(0, 200)}`);
          await sqlClient`
            INSERT INTO public.schema_migrations_applied (filename)
            VALUES (${filename})
            ON CONFLICT (filename) DO NOTHING
          `;
          writeFileSync(
            logPath,
            JSON.stringify({ at: new Date().toISOString(), filename, status: 'warn', msg: msg.slice(0, 500) }) +
              '\n',
            { flag: 'a' },
          );
          ok++;
          continue;
        }
        console.error(`FAIL: ${filename}\n  ${msg}`);
        writeFileSync(
          logPath,
          JSON.stringify({ at: new Date().toISOString(), filename, status: 'fail', msg: msg.slice(0, 1000) }) +
            '\n',
          { flag: 'a' },
        );
        failed++;
        // Stop on hard failures so schema stays consistent
        break;
      }
    }
  } finally {
    await sqlClient.end({ timeout: 5 });
  }

  console.log(`\nDone. applied=${ok} skipped=${skipped} failed=${failed}`);
  process.exit(failed > 0 ? 4 : 0);
}

main();

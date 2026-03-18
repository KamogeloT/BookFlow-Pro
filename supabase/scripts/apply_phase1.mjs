import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { createRequire } from 'node:module'

const require = createRequire(import.meta.url)

// `pg` is installed in `web/node_modules` (this is a one-off runner).
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..')
// eslint-disable-next-line @typescript-eslint/no-var-requires
const pg = require(path.join(repoRoot, 'web', 'node_modules', 'pg'))

const { Client } = pg

// Connection string must be provided via env var to avoid committing secrets.
// Example: set SUPABASE_DB_URL="postgresql://postgres:<pwd>@<host>:5432/postgres"
const connectionString = process.env.SUPABASE_DB_URL
if (!connectionString) {
  throw new Error('Missing env var SUPABASE_DB_URL (no secrets are committed to git).')
}

const email = process.env.SUPABASE_MAPPING_EMAIL ?? 'kjsemathu@gmail.com'

const migrationsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'migrations')
const seedDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'seed')

async function readSql(filePath) {
  return await fs.readFile(filePath, 'utf8')
}

async function main() {
  const client = new Client({ connectionString })

  await client.connect()

  const migrationFiles = ['0001_core_schema_and_rls.sql', '0002_booking_rpcs.sql']
  for (const f of migrationFiles) {
    const fullPath = path.join(migrationsDir, f)
    const sql = await readSql(fullPath)
    console.log(`Applying migration: ${f}`)
    await client.query(sql)
  }

  const seedFiles = ['0001_reference_data_and_dev_dataset.sql']
  for (const f of seedFiles) {
    const fullPath = path.join(seedDir, f)
    const sql = await readSql(fullPath)
    console.log(`Applying seed: ${f}`)
    await client.query(sql)
  }

  // Map user email -> auth.users.id -> public.user_profiles for the seeded dev tenant.
  // Seed script uses slug='dev' for the dev tenant.
  const tenantRes = await client.query(
    `select id from public.tenants where slug = $1 limit 1`,
    ['dev']
  )
  const tenantId = tenantRes.rows[0]?.id
  if (!tenantId) throw new Error("Could not find seeded dev tenant (slug='dev').")

  const authUserRes = await client.query(
    `select id from auth.users where email = $1 limit 1`,
    [email]
  )
  const authUserId = authUserRes.rows[0]?.id
  if (!authUserId) throw new Error(`Could not find Supabase auth user for email: ${email}`)

  // Upsert user profile row.
  const profileRes = await client.query(
    `insert into public.user_profiles (auth_user_id, tenant_id, email, is_active)
     values ($1, $2, $3, true)
     on conflict (auth_user_id)
     do update set tenant_id = excluded.tenant_id, email = excluded.email, is_active = true
     returning id`,
    [authUserId, tenantId, email]
  )
  const userProfileId = profileRes.rows[0]?.id
  if (!userProfileId) throw new Error('Failed to upsert user_profiles.')

  // Ensure Tenant Admin primary role for this profile.
  const roleRes = await client.query(
    `select id from public.roles where tenant_id = $1 and name = $2 limit 1`,
    [tenantId, 'Tenant Admin']
  )
  const tenantAdminRoleId = roleRes.rows[0]?.id
  if (!tenantAdminRoleId) throw new Error("Could not find role 'Tenant Admin' for dev tenant.")

  await client.query(`update public.user_role_assignments set is_primary = false where user_profile_id = $1`, [
    userProfileId,
  ])

  await client.query(
    `insert into public.user_role_assignments (tenant_id, user_profile_id, role_id, is_primary)
     values ($1, $2, $3, true)
     on conflict do nothing`,
    [tenantId, userProfileId, tenantAdminRoleId]
  )

  console.log('Phase 1 DB migrations + seed + user profile mapping completed.')
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })


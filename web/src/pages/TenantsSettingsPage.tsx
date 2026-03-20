import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type TenantRow = {
  id: string
  name: string
  slug: string
  status: string
  default_timezone: string
}

export function TenantsSettingsPage() {
  return (
    <RoleGuard allowedRoles={['Tenant Admin']}>
      <TenantsInner />
    </RoleGuard>
  )
}

function TenantsInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [row, setRow] = useState<TenantRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase.from('tenants').select('id,name,slug,status,default_timezone').eq('id', tenantId).single()
      if (qErr) throw qErr
      setRow(data as TenantRow)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load tenant')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  async function save() {
    if (!row) return
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const { error: uErr } = await supabase
        .from('tenants')
        .update({
          name: row.name,
          status: row.status,
          default_timezone: row.default_timezone,
          updated_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      if (uErr) throw uErr
      setOk('Organisation updated.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed (apply migration 0005 if update is denied).')
    } finally {
      setSaving(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="Tenants">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId || !row) {
    return (
      <SettingsShell title="Tenants" error={tErr ?? 'Could not load tenant.'}>
        <p className="text-sm text-gray-500">Your account must belong to a tenant.</p>
      </SettingsShell>
    )
  }

  return (
    <SettingsShell
      title="Organisation"
      description="You can edit your organisation profile. Slug is fixed; branding lives under Branding & Themes."
      error={error}
      onDismissError={() => setError(null)}
    >
      {ok ? <p className="mb-4 text-sm text-green-700 dark:text-green-400">{ok}</p> : null}

      <div className="grid gap-4 max-w-xl">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Name
          <input className={`mt-1 ${settingsInputClass}`} value={row.name} onChange={(e) => setRow({ ...row, name: e.target.value })} />
        </label>
        <div>
          <span className="block text-sm font-medium text-gray-700 dark:text-gray-300">Slug</span>
          <p className="mt-1 rounded-lg border border-dashed border-gray-200 dark:border-gray-700 px-3 py-2 text-sm text-gray-600 dark:text-gray-400">
            {row.slug}
          </p>
          <p className="mt-1 text-xs text-gray-500">Slug cannot be changed from the app.</p>
        </div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Status
          <select
            className={`mt-1 ${settingsInputClass}`}
            value={row.status}
            onChange={(e) => setRow({ ...row, status: e.target.value })}
          >
            <option value="Active">Active</option>
            <option value="Suspended">Suspended</option>
            <option value="Trial">Trial</option>
          </select>
        </label>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Default timezone
          <input
            className={`mt-1 ${settingsInputClass}`}
            value={row.default_timezone}
            onChange={(e) => setRow({ ...row, default_timezone: e.target.value })}
            placeholder="Africa/Johannesburg"
          />
        </label>
        <div className="flex flex-wrap gap-3">
          <button type="button" className={settingsBtnPrimary} disabled={saving} onClick={() => void save()}>
            {saving ? 'Saving…' : 'Save organisation'}
          </button>
          <Link to="/settings/branding" className="text-sm text-purple-700 dark:text-purple-300 underline self-center">
            Edit branding →
          </Link>
        </div>
      </div>
    </SettingsShell>
  )
}

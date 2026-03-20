import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type BrandingRow = {
  id: string
  tenant_id: string
  app_name: string | null
  logo_url: string | null
  favicon_url: string | null
  accent_color: string | null
  mode: string
  custom_css: string | null
}

export function BrandingSettingsPage() {
  return (
    <RoleGuard allowedRoles={['Tenant Admin']}>
      <BrandingInner />
    </RoleGuard>
  )
}

function BrandingInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [row, setRow] = useState<BrandingRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [ok, setOk] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase.from('tenant_branding').select('*').eq('tenant_id', tenantId).maybeSingle()
      if (qErr) throw qErr
      setRow(
        data
          ? (data as BrandingRow)
          : {
              id: '',
              tenant_id: tenantId,
              app_name: '',
              logo_url: '',
              favicon_url: '',
              accent_color: '#0A84FF',
              mode: 'system',
              custom_css: '',
            }
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load branding')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  async function save() {
    if (!tenantId || !row) return
    setSaving(true)
    setError(null)
    setOk(null)
    try {
      const payload: Record<string, unknown> = {
        tenant_id: tenantId,
        app_name: row.app_name || null,
        logo_url: row.logo_url || null,
        favicon_url: row.favicon_url || null,
        accent_color: row.accent_color || null,
        mode: row.mode || 'system',
        custom_css: row.custom_css || null,
        updated_at: new Date().toISOString(),
      }
      if (row.id) payload.id = row.id
      const { error: uErr } = await supabase.from('tenant_branding').upsert(payload, { onConflict: 'tenant_id' })
      if (uErr) throw uErr
      setOk('Branding saved.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="Branding & Themes">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId) {
    return (
      <SettingsShell title="Branding & Themes" error={tErr ?? 'No tenant on your profile.'}>
        <p className="text-sm text-gray-500">Sign in with a user linked to a tenant.</p>
      </SettingsShell>
    )
  }

  return (
    <SettingsShell
      title="Branding & Themes"
      description="Customer-facing name, colors, and theme mode for this organisation."
      error={error}
      onDismissError={() => setError(null)}
    >
      {ok ? <p className="mb-4 text-sm text-green-700 dark:text-green-400">{ok}</p> : null}

      {row ? (
        <div className="grid gap-4 max-w-xl">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            App name
            <input
              className={`mt-1 ${settingsInputClass}`}
              value={row.app_name ?? ''}
              onChange={(e) => setRow({ ...row, app_name: e.target.value })}
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Logo URL
            <input
              className={`mt-1 ${settingsInputClass}`}
              value={row.logo_url ?? ''}
              onChange={(e) => setRow({ ...row, logo_url: e.target.value })}
              placeholder="https://…"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Favicon URL
            <input
              className={`mt-1 ${settingsInputClass}`}
              value={row.favicon_url ?? ''}
              onChange={(e) => setRow({ ...row, favicon_url: e.target.value })}
              placeholder="https://…"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Accent color
            <input
              className={`mt-1 ${settingsInputClass}`}
              value={row.accent_color ?? ''}
              onChange={(e) => setRow({ ...row, accent_color: e.target.value })}
              placeholder="#0A84FF"
            />
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Theme mode
            <select
              className={`mt-1 ${settingsInputClass}`}
              value={row.mode}
              onChange={(e) => setRow({ ...row, mode: e.target.value })}
            >
              <option value="system">System</option>
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </label>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Custom CSS (optional)
            <textarea
              className={`mt-1 min-h-[120px] font-mono text-xs ${settingsInputClass}`}
              value={row.custom_css ?? ''}
              onChange={(e) => setRow({ ...row, custom_css: e.target.value })}
            />
          </label>
          <div>
            <button type="button" className={settingsBtnPrimary} disabled={saving} onClick={() => void save()}>
              {saving ? 'Saving…' : 'Save branding'}
            </button>
          </div>
        </div>
      ) : null}
    </SettingsShell>
  )
}

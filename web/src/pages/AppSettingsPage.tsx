import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsBtnSecondary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type AppSettingRow = {
  id: string
  setting_key: string
  setting_value: unknown
  is_secret: boolean
}

export function AppSettingsPage() {
  return (
    <RoleGuard allowedRoles={['Tenant Admin']}>
      <AppSettingsInner />
    </RoleGuard>
  )
}

function stringifyVal(v: unknown) {
  if (v === null || v === undefined) return ''
  if (typeof v === 'string') return v
  try {
    return JSON.stringify(v, null, 2)
  } catch {
    return String(v)
  }
}

function parseVal(text: string): unknown {
  const t = text.trim()
  if (t === '') return null
  if (t === 'true') return true
  if (t === 'false') return false
  if (/^-?\d+$/.test(t)) return Number(t)
  try {
    return JSON.parse(t) as unknown
  } catch {
    return t
  }
}

function AppSettingsInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [rows, setRows] = useState<AppSettingRow[]>([])
  const [textById, setTextById] = useState<Record<string, string>>({})
  const [secretNewByKey, setSecretNewByKey] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newKey, setNewKey] = useState('')
  const [newVal, setNewVal] = useState('true')
  const [newSecret, setNewSecret] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('app_settings')
        .select('id,setting_key,setting_value,is_secret')
        .eq('tenant_id', tenantId)
        .order('setting_key')
      if (qErr) throw qErr
      const list = (data ?? []) as AppSettingRow[]
      setRows(list)
      const tb: Record<string, string> = {}
      for (const r of list) {
        tb[r.id] = r.is_secret ? '' : stringifyVal(r.setting_value)
      }
      setTextById(tb)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load settings')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  async function saveRow(row: AppSettingRow) {
    setBusy(true)
    setError(null)
    try {
      let value: unknown
      if (row.is_secret) {
        const raw = secretNewByKey[row.setting_key]?.trim() ?? ''
        if (!raw) {
          setError('Enter a new value for secret keys, or leave unchanged (no-op not implemented—type a value).')
          setBusy(false)
          return
        }
        value = parseVal(raw)
      } else {
        value = parseVal(textById[row.id] ?? '')
      }
      const { error: rErr } = await supabase.rpc('upsert_app_setting', {
        p_setting_key: row.setting_key,
        p_setting_value: value as never,
        p_is_secret: row.is_secret,
      })
      if (rErr) throw rErr
      setSecretNewByKey((prev) => ({ ...prev, [row.setting_key]: '' }))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function addSetting() {
    if (!newKey.trim()) return
    setBusy(true)
    setError(null)
    try {
      const value = parseVal(newVal)
      const { error: rErr } = await supabase.rpc('upsert_app_setting', {
        p_setting_key: newKey.trim(),
        p_setting_value: value as never,
        p_is_secret: newSecret,
      })
      if (rErr) throw rErr
      setNewKey('')
      setNewVal('true')
      setNewSecret(false)
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="App Settings">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId) {
    return <SettingsShell title="App Settings" error={tErr ?? 'No tenant.'} />
  }

  return (
    <SettingsShell
      title="App Settings"
      description="Tenant-scoped feature flags and configuration (stored as JSON). Secret values are write-only from this UI."
      error={error}
      onDismissError={() => setError(null)}
    >
      <section className="mb-8 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Add / upsert key</h2>
        <input
          className={settingsInputClass}
          placeholder="setting_key e.g. features.waitlist_enabled"
          value={newKey}
          onChange={(e) => setNewKey(e.target.value)}
        />
        <textarea
          className={`min-h-[80px] font-mono text-xs ${settingsInputClass}`}
          value={newVal}
          onChange={(e) => setNewVal(e.target.value)}
        />
        <label className="text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
          <input type="checkbox" checked={newSecret} onChange={(e) => setNewSecret(e.target.checked)} />
          Store as secret (value hidden after save)
        </label>
        <button type="button" className={settingsBtnPrimary} disabled={busy} onClick={() => void addSetting()}>
          Upsert setting
        </button>
      </section>

      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-mono text-sm font-medium text-purple-800 dark:text-purple-200">{r.setting_key}</span>
              {r.is_secret ? (
                <span className="text-[10px] uppercase tracking-wide bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200 px-2 py-0.5 rounded">
                  secret
                </span>
              ) : null}
            </div>
            {r.is_secret ? (
              <div>
                <p className="text-xs text-gray-500 mb-1">Value is hidden. Enter a replacement to update.</p>
                <textarea
                  className={`min-h-[72px] font-mono text-xs ${settingsInputClass}`}
                  placeholder="New JSON or string value"
                  value={secretNewByKey[r.setting_key] ?? ''}
                  onChange={(e) => setSecretNewByKey((prev) => ({ ...prev, [r.setting_key]: e.target.value }))}
                />
              </div>
            ) : (
              <textarea
                className={`min-h-[100px] font-mono text-xs ${settingsInputClass}`}
                value={textById[r.id] ?? ''}
                onChange={(e) => setTextById((prev) => ({ ...prev, [r.id]: e.target.value }))}
              />
            )}
            <button type="button" className={settingsBtnSecondary} disabled={busy} onClick={() => void saveRow(r)}>
              Save
            </button>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-gray-500">No app settings rows yet (seed adds defaults).</p> : null}
    </SettingsShell>
  )
}

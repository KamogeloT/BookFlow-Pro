import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { FeatureShell, featBtnPrimary, featBtnSecondary, featInput } from '../components/FeatureShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type Row = {
  id: string
  name: string
  provider: string
  status: string
  config: Record<string, unknown>
}

const ROLES = ['Tenant Admin', 'Branch Admin'] as const

export function ApiIntegrationsPage() {
  return (
    <RoleGuard allowedRoles={[...ROLES]}>
      <ApiInner />
    </RoleGuard>
  )
}

function ApiInner() {
  const { tenantId, loading: tLoad, error: tErr } = useTenantProfile()
  const [rows, setRows] = useState<Row[]>([])
  const [jsonById, setJsonById] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [newRow, setNewRow] = useState({ name: '', provider: 'custom', config: '{}' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('api_integrations')
        .select('id,name,provider,status,config')
        .order('name')
      if (qErr) throw qErr
      const list = (data ?? []) as Row[]
      setRows(list)
      const j: Record<string, string> = {}
      for (const r of list) j[r.id] = JSON.stringify(r.config ?? {}, null, 2)
      setJsonById(j)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function create() {
    if (!tenantId || !newRow.name.trim()) return
    let config: Record<string, unknown> = {}
    try {
      config = JSON.parse(newRow.config || '{}') as Record<string, unknown>
    } catch {
      setError('Config must be valid JSON')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('api_integrations').insert({
        tenant_id: tenantId,
        name: newRow.name.trim(),
        provider: newRow.provider.trim() || 'custom',
        config,
        status: 'Active',
      })
      if (iErr) throw iErr
      setNewRow({ name: '', provider: 'custom', config: '{}' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function save(r: Row) {
    let config: Record<string, unknown> = {}
    try {
      config = JSON.parse(jsonById[r.id] || '{}') as Record<string, unknown>
    } catch {
      setError('Invalid JSON in config')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase
        .from('api_integrations')
        .update({ name: r.name, provider: r.provider, status: r.status, config, updated_at: new Date().toISOString() })
        .eq('id', r.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function remove(id: string) {
    if (!confirm('Delete integration?')) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('api_integrations').delete().eq('id', id)
      if (dErr) throw dErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed (check API keys FK).')
    } finally {
      setBusy(false)
    }
  }

  if (tLoad || loading) {
    return (
      <FeatureShell title="API Integrations">
        <p className="text-sm text-gray-500">Loading…</p>
      </FeatureShell>
    )
  }
  if (tErr) {
    return <FeatureShell title="API Integrations" error={tErr} />
  }

  return (
    <FeatureShell
      title="API Integrations"
      description="Register third-party integrations (config JSON). API key issuance can be added later."
      error={error}
      onDismissError={() => setError(null)}
    >
      <section className="mb-8 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold">New integration</h2>
        <input className={featInput} placeholder="Name" value={newRow.name} onChange={(e) => setNewRow({ ...newRow, name: e.target.value })} />
        <input className={featInput} placeholder="Provider" value={newRow.provider} onChange={(e) => setNewRow({ ...newRow, provider: e.target.value })} />
        <textarea className={`min-h-[80px] font-mono text-xs ${featInput}`} value={newRow.config} onChange={(e) => setNewRow({ ...newRow, config: e.target.value })} />
        <button type="button" className={featBtnPrimary} disabled={busy} onClick={() => void create()}>
          Create
        </button>
      </section>

      <div className="flex justify-end mb-2">
        <button type="button" className={featBtnSecondary} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-2">
            <div className="flex flex-wrap gap-2">
              <input className={featInput + ' flex-1 min-w-[160px]'} value={r.name} onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))} />
              <input className={featInput + ' w-40'} value={r.provider} onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, provider: e.target.value } : x)))} />
              <select
                className={featInput + ' w-36'}
                value={r.status}
                onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, status: e.target.value } : x)))}
              >
                <option value="Active">Active</option>
                <option value="Paused">Paused</option>
              </select>
            </div>
            <textarea
              className={`min-h-[100px] font-mono text-xs w-full ${featInput}`}
              value={jsonById[r.id] ?? '{}'}
              onChange={(e) => setJsonById((prev) => ({ ...prev, [r.id]: e.target.value }))}
            />
            <div className="flex gap-2">
              <button type="button" className={featBtnSecondary} disabled={busy} onClick={() => void save(rows.find((x) => x.id === r.id)!)}>
                Save
              </button>
              <button type="button" className="text-red-600 text-sm underline" disabled={busy} onClick={() => void remove(r.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-gray-500">No integrations yet.</p> : null}
    </FeatureShell>
  )
}

import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsBtnSecondary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type WebhookRow = {
  id: string
  name: string
  endpoint_url: string
  secret_ref: string | null
  events: string[]
  is_active: boolean
  timeout_ms: number
  retry_limit: number
}

type DeliveryRow = {
  id: string
  endpoint_id: string
  event_name: string
  status: string
  response_code: number | null
  attempts: number
  created_at: string
}

const SETTINGS_ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

function eventsToString(events: string[]) {
  return (events ?? []).join(', ')
}

function parseEvents(s: string): string[] {
  return s
    .split(/[,\n]/)
    .map((x) => x.trim())
    .filter(Boolean)
}

export function WebhooksSettingsPage() {
  return (
    <RoleGuard allowedRoles={[...SETTINGS_ROLES]}>
      <WebhooksInner />
    </RoleGuard>
  )
}

function WebhooksInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [rows, setRows] = useState<WebhookRow[]>([])
  const [eventText, setEventText] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newHook, setNewHook] = useState({
    name: '',
    endpoint_url: '',
    events: 'booking.created, booking.cancelled',
    secret_ref: '',
  })
  const [tab, setTab] = useState<'endpoints' | 'deliveries'>('endpoints')
  const [deliveries, setDeliveries] = useState<DeliveryRow[]>([])

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const [epRes, delRes] = await Promise.all([
        supabase
          .from('webhook_endpoints')
          .select('id,name,endpoint_url,secret_ref,events,is_active,timeout_ms,retry_limit')
          .eq('tenant_id', tenantId)
          .order('name'),
        supabase
          .from('webhook_deliveries')
          .select('id,endpoint_id,event_name,status,response_code,attempts,created_at')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(100),
      ])
      if (epRes.error) throw epRes.error
      if (delRes.error) throw delRes.error
      const list = (epRes.data ?? []) as WebhookRow[]
      setRows(list)
      const et: Record<string, string> = {}
      for (const r of list) et[r.id] = eventsToString(r.events ?? [])
      setEventText(et)
      setDeliveries((delRes.data ?? []) as DeliveryRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load webhooks')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  async function createHook() {
    if (!tenantId || !newHook.name.trim() || !newHook.endpoint_url.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('webhook_endpoints').insert({
        tenant_id: tenantId,
        name: newHook.name.trim(),
        endpoint_url: newHook.endpoint_url.trim(),
        secret_ref: newHook.secret_ref.trim() || null,
        events: parseEvents(newHook.events),
        is_active: true,
        timeout_ms: 8000,
        retry_limit: 3,
      })
      if (iErr) throw iErr
      setNewHook({ name: '', endpoint_url: '', events: 'booking.created, booking.cancelled', secret_ref: '' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveHook(r: WebhookRow) {
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase
        .from('webhook_endpoints')
        .update({
          name: r.name,
          endpoint_url: r.endpoint_url,
          secret_ref: r.secret_ref,
          events: parseEvents(eventText[r.id] ?? ''),
          is_active: r.is_active,
          timeout_ms: r.timeout_ms,
          retry_limit: r.retry_limit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', r.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteHook(id: string) {
    if (!confirm('Delete this webhook endpoint?')) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('webhook_endpoints').delete().eq('id', id)
      if (dErr) throw dErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="Webhooks">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId) {
    return <SettingsShell title="Webhooks" error={tErr ?? 'No tenant.'} />
  }

  return (
    <SettingsShell
      title="Webhooks"
      description="Outbound HTTP endpoints, event names, and recent delivery attempts."
      error={error}
      onDismissError={() => setError(null)}
    >
      <div className="flex flex-wrap gap-2 mb-6">
        <button
          type="button"
          onClick={() => setTab('endpoints')}
          className={
            tab === 'endpoints'
              ? `${settingsBtnSecondary} ring-2 ring-purple-500`
              : settingsBtnSecondary
          }
        >
          Endpoints
        </button>
        <button
          type="button"
          onClick={() => setTab('deliveries')}
          className={
            tab === 'deliveries'
              ? `${settingsBtnSecondary} ring-2 ring-purple-500`
              : settingsBtnSecondary
          }
        >
          Deliveries ({deliveries.length})
        </button>
      </div>

      {tab === 'deliveries' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800 mb-8">
          <table className="min-w-[720px] w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="p-2">Time</th>
                <th className="p-2">Event</th>
                <th className="p-2">Status</th>
                <th className="p-2">HTTP</th>
                <th className="p-2">Tries</th>
                <th className="p-2">Endpoint</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {deliveries.map((d) => (
                <tr key={d.id}>
                  <td className="p-2 whitespace-nowrap">{new Date(d.created_at).toLocaleString()}</td>
                  <td className="p-2 font-mono">{d.event_name}</td>
                  <td className="p-2 font-medium">{d.status}</td>
                  <td className="p-2">{d.response_code ?? '—'}</td>
                  <td className="p-2">{d.attempts}</td>
                  <td className="p-2 font-mono text-[10px] break-all">{d.endpoint_id}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {deliveries.length === 0 ? <p className="p-4 text-sm text-gray-500">No delivery rows yet.</p> : null}
        </div>
      ) : null}

      {tab === 'endpoints' ? (
        <>
      <section className="mb-8 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold">New endpoint</h2>
        <input
          className={settingsInputClass}
          placeholder="Name"
          value={newHook.name}
          onChange={(e) => setNewHook({ ...newHook, name: e.target.value })}
        />
        <input
          className={settingsInputClass}
          placeholder="https://…"
          value={newHook.endpoint_url}
          onChange={(e) => setNewHook({ ...newHook, endpoint_url: e.target.value })}
        />
        <input
          className={settingsInputClass}
          placeholder="Secret ref (optional)"
          value={newHook.secret_ref}
          onChange={(e) => setNewHook({ ...newHook, secret_ref: e.target.value })}
        />
        <textarea
          className={`min-h-[72px] font-mono text-xs ${settingsInputClass}`}
          value={newHook.events}
          onChange={(e) => setNewHook({ ...newHook, events: e.target.value })}
        />
        <button type="button" className={settingsBtnPrimary} disabled={busy} onClick={() => void createHook()}>
          Add webhook
        </button>
      </section>

      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-2">
            <input
              className={settingsInputClass}
              value={r.name}
              onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
            />
            <input
              className={settingsInputClass}
              value={r.endpoint_url}
              onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, endpoint_url: e.target.value } : x)))}
            />
            <input
              className={settingsInputClass}
              placeholder="Secret ref"
              value={r.secret_ref ?? ''}
              onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, secret_ref: e.target.value || null } : x)))}
            />
            <textarea
              className={`min-h-[72px] font-mono text-xs ${settingsInputClass}`}
              value={eventText[r.id] ?? ''}
              onChange={(e) => setEventText((prev) => ({ ...prev, [r.id]: e.target.value }))}
            />
            <div className="flex flex-wrap gap-3 items-center text-sm">
              <label className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={r.is_active}
                  onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: e.target.checked } : x)))}
                />
                Active
              </label>
              <label className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                Timeout ms
                <input
                  type="number"
                  className="w-24 rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm"
                  value={r.timeout_ms}
                  onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, timeout_ms: Number(e.target.value) } : x)))}
                />
              </label>
              <label className="flex items-center gap-1 text-gray-600 dark:text-gray-400">
                Retries
                <input
                  type="number"
                  className="w-16 rounded border border-gray-200 dark:border-gray-700 px-2 py-1 text-sm"
                  value={r.retry_limit}
                  onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, retry_limit: Number(e.target.value) } : x)))}
                />
              </label>
            </div>
            <div className="flex gap-2">
              <button type="button" className={settingsBtnSecondary} disabled={busy} onClick={() => void saveHook(rows.find((x) => x.id === r.id)!)}>
                Save
              </button>
              <button type="button" className="text-red-600 text-sm underline" disabled={busy} onClick={() => void deleteHook(r.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-gray-500">No webhook endpoints yet.</p> : null}
        </>
      ) : null}
    </SettingsShell>
  )
}

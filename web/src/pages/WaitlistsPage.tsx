import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { FeatureShell, featBtnPrimary, featBtnSecondary, featInput } from '../components/FeatureShell'

type WaitRow = {
  id: string
  status: string
  priority: number
  notes: string | null
  requested_start: string | null
  requested_end: string | null
  created_at: string
}

type Svc = { id: string; name: string; code: string }
type Br = { id: string; name: string }

const ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher', 'Staff'] as const

export function WaitlistsPage() {
  return (
    <RoleGuard allowedRoles={[...ROLES]}>
      <WaitlistsInner />
    </RoleGuard>
  )
}

function WaitlistsInner() {
  const [rows, setRows] = useState<WaitRow[]>([])
  const [services, setServices] = useState<Svc[]>([])
  const [branches, setBranches] = useState<Br[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [form, setForm] = useState({
    email: '',
    service_id: '',
    branch_id: '',
    start: '',
    end: '',
    priority: 0,
    notes: '',
  })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [wRes, sRes, bRes] = await Promise.all([
        supabase
          .from('waitlists')
          .select('id,status,priority,notes,requested_start,requested_end,created_at')
          .order('priority', { ascending: false })
          .order('created_at', { ascending: false })
          .limit(100),
        supabase.from('services').select('id,name,code').eq('is_active', true).order('code'),
        supabase.from('branches').select('id,name').order('name'),
      ])
      if (wRes.error) throw wRes.error
      if (sRes.error) throw sRes.error
      if (bRes.error) throw bRes.error
      setRows((wRes.data ?? []) as WaitRow[])
      setServices((sRes.data ?? []) as Svc[])
      setBranches((bRes.data ?? []) as Br[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function submit() {
    if (!form.email.trim() || !form.service_id) {
      setError('Email and service are required.')
      return
    }
    const rs = form.start ? new Date(form.start) : null
    const re = form.end ? new Date(form.end) : null
    if (form.start && Number.isNaN(rs?.getTime() ?? NaN)) {
      setError('Invalid start time')
      return
    }
    if (form.end && Number.isNaN(re?.getTime() ?? NaN)) {
      setError('Invalid end time')
      return
    }
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const { data, error: rErr } = await supabase.rpc('add_waitlist_entry', {
        p_service_id: form.service_id,
        p_branch_id: form.branch_id || null,
        p_customer_email: form.email.trim(),
        p_requested_start: rs?.toISOString() ?? null,
        p_requested_end: re?.toISOString() ?? null,
        p_priority: Number(form.priority) || 0,
        p_notes: form.notes.trim() || null,
      })
      if (rErr) throw rErr
      setMsg(`Added to waitlist (id: ${data ?? 'ok'}).`)
      setForm((f) => ({ ...f, notes: '', priority: 0 }))
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'RPC failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FeatureShell
      title="Waitlists"
      description="View waitlist entries and add customers via add_waitlist_entry."
      error={error}
      onDismissError={() => setError(null)}
    >
      {msg ? <p className="mb-4 text-sm text-green-700 dark:text-green-400">{msg}</p> : null}

      <section className="mb-8 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold">Add entry</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={featInput}
            placeholder="Customer email *"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <select className={featInput} value={form.service_id} onChange={(e) => setForm({ ...form, service_id: e.target.value })}>
            <option value="">Service *</option>
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.code}
              </option>
            ))}
          </select>
          <select className={featInput} value={form.branch_id} onChange={(e) => setForm({ ...form, branch_id: e.target.value })}>
            <option value="">Branch (optional)</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>
          <input
            type="number"
            className={featInput}
            placeholder="Priority"
            value={form.priority}
            onChange={(e) => setForm({ ...form, priority: Number(e.target.value) })}
          />
          <input
            type="datetime-local"
            className={featInput}
            value={form.start}
            onChange={(e) => setForm({ ...form, start: e.target.value })}
          />
          <input
            type="datetime-local"
            className={featInput}
            value={form.end}
            onChange={(e) => setForm({ ...form, end: e.target.value })}
          />
        </div>
        <textarea className={`${featInput} min-h-[72px]`} placeholder="Notes" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button type="button" className={featBtnPrimary} disabled={busy} onClick={() => void submit()}>
          Add to waitlist
        </button>
      </section>

      <div className="flex justify-end mb-2">
        <button type="button" className={featBtnSecondary} disabled={loading} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800">
          <table className="min-w-[720px] w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="p-2">Created</th>
                <th className="p-2">Status</th>
                <th className="p-2">Pri</th>
                <th className="p-2">Window</th>
                <th className="p-2">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => (
                <tr key={r.id}>
                  <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2 font-medium">{r.status}</td>
                  <td className="p-2">{r.priority}</td>
                  <td className="p-2 text-gray-600">
                    {r.requested_start ? new Date(r.requested_start).toLocaleString() : '—'} →{' '}
                    {r.requested_end ? new Date(r.requested_end).toLocaleString() : '—'}
                  </td>
                  <td className="p-2 max-w-xs truncate">{r.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="p-4 text-sm text-gray-500">No waitlist rows.</p> : null}
        </div>
      )}
    </FeatureShell>
  )
}

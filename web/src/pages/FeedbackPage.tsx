import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { FeatureShell, featBtnPrimary, featBtnSecondary, featInput } from '../components/FeatureShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type Entry = {
  id: string
  rating: number | null
  category: string | null
  message: string | null
  status: string
  created_at: string
}

const ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher', 'Staff'] as const

export function FeedbackPage() {
  return (
    <RoleGuard allowedRoles={[...ROLES]}>
      <FeedbackInner />
    </RoleGuard>
  )
}

function FeedbackInner() {
  const { tenantId, loading: tLoad, error: tErr } = useTenantProfile()
  const [rows, setRows] = useState<Entry[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [form, setForm] = useState({ rating: 5, category: '', message: '' })

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('feedback_entries')
        .select('id,rating,category,message,status,created_at')
        .order('created_at', { ascending: false })
        .limit(80)
      if (qErr) throw qErr
      setRows((data ?? []) as Entry[])
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
    if (!tenantId) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const { error: iErr } = await supabase.from('feedback_entries').insert({
        tenant_id: tenantId,
        rating: form.rating,
        category: form.category.trim() || null,
        message: form.message.trim() || null,
        status: 'Open',
      })
      if (iErr) throw iErr
      setForm({ rating: 5, category: '', message: '' })
      setMsg('Feedback submitted.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Submit failed')
    } finally {
      setBusy(false)
    }
  }

  async function setStatus(id: string, status: string) {
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase.from('feedback_entries').update({ status, updated_at: new Date().toISOString() }).eq('id', id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  if (tLoad || loading) {
    return (
      <FeatureShell title="Feedback">
        <p className="text-sm text-gray-500">Loading…</p>
      </FeatureShell>
    )
  }
  if (tErr) {
    return <FeatureShell title="Feedback" error={tErr} />
  }

  return (
    <FeatureShell
      title="Feedback"
      description="Internal capture of feedback entries for the tenant."
      error={error}
      onDismissError={() => setError(null)}
    >
      {msg ? <p className="mb-4 text-sm text-green-700 dark:text-green-400">{msg}</p> : null}

      <section className="mb-8 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3 max-w-xl">
        <h2 className="text-sm font-semibold">Log feedback</h2>
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Rating (1–5)
          <input
            type="number"
            min={1}
            max={5}
            className={`mt-1 ${featInput}`}
            value={form.rating}
            onChange={(e) => setForm({ ...form, rating: Number(e.target.value) })}
          />
        </label>
        <input className={featInput} placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} />
        <textarea className={`${featInput} min-h-[100px]`} placeholder="Message" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
        <button type="button" className={featBtnPrimary} disabled={busy} onClick={() => void submit()}>
          Submit
        </button>
      </section>

      <div className="flex justify-end mb-2">
        <button type="button" className={featBtnSecondary} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800">
        <table className="min-w-[640px] w-full text-xs text-left">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th className="p-2">When</th>
              <th className="p-2">Rating</th>
              <th className="p-2">Category</th>
              <th className="p-2">Message</th>
              <th className="p-2">Status</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                <td className="p-2">{r.rating ?? '—'}</td>
                <td className="p-2">{r.category ?? '—'}</td>
                <td className="p-2 max-w-xs truncate">{r.message ?? '—'}</td>
                <td className="p-2 font-medium">{r.status}</td>
                <td className="p-2">
                  {r.status === 'Open' ? (
                    <button type="button" className="text-xs underline text-purple-700" disabled={busy} onClick={() => void setStatus(r.id, 'Resolved')}>
                      Resolve
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="p-4 text-sm text-gray-500">No entries.</p> : null}
      </div>
    </FeatureShell>
  )
}

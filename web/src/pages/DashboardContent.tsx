import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { FeatureShell, featBtnPrimary, featBtnSecondary } from '../components/FeatureShell'
import { fetchDashboardStats, type DashboardStats } from '../lib/dashboardStats'
import { useTenantProfile } from '../hooks/useTenantProfile'

type SnapshotRow = {
  id: string
  snapshot_at: string
  snapshot_scope: string
  metrics: Record<string, unknown>
}

export function DashboardContent({
  title,
  description,
  snapshotCode,
  extraLinks,
}: {
  title: string
  description?: string
  snapshotCode: string
  extraLinks?: { to: string; label: string }[]
}) {
  const { tenantId, loading: tLoad, error: tErr } = useTenantProfile()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [snapshots, setSnapshots] = useState<SnapshotRow[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const [s, sn] = await Promise.all([
        fetchDashboardStats(supabase),
        supabase
          .from('dashboard_snapshots')
          .select('id,snapshot_at,snapshot_scope,metrics')
          .eq('tenant_id', tenantId)
          .eq('dashboard_code', snapshotCode)
          .order('snapshot_at', { ascending: false })
          .limit(8),
      ])
      if (sn.error) throw sn.error
      setStats(s)
      setSnapshots((sn.data ?? []) as SnapshotRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load dashboard')
    } finally {
      setLoading(false)
    }
  }, [tenantId, snapshotCode])

  useEffect(() => {
    if (tenantId) void refresh()
  }, [tenantId, refresh])

  async function captureSnapshot() {
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const { error: rErr } = await supabase.rpc('capture_dashboard_snapshot', {
        p_dashboard_code: snapshotCode,
        p_scope: 'daily',
      })
      if (rErr) throw rErr
      setMsg('Snapshot captured.')
      await refresh()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Snapshot failed')
    } finally {
      setBusy(false)
    }
  }

  if (tLoad || (loading && !stats)) {
    return (
      <FeatureShell title={title}>
        <p className="text-sm text-gray-500">Loading…</p>
      </FeatureShell>
    )
  }
  if (tErr) {
    return <FeatureShell title={title} error={tErr} />
  }
  if (!tenantId) {
    return <FeatureShell title={title} error="No tenant linked to your profile." />
  }

  const cards = stats
    ? [
        { label: 'Bookings today', value: stats.bookingsToday },
        { label: 'Waitlist (open)', value: stats.waitlistOpen },
        { label: 'Notifications queued', value: stats.notificationsQueued },
        { label: 'Feedback (open)', value: stats.feedbackOpen },
      ]
    : []

  return (
    <FeatureShell title={title} description={description} error={error} onDismissError={() => setError(null)}>
      {msg ? <p className="mb-4 text-sm text-green-700 dark:text-green-400">{msg}</p> : null}

      {extraLinks?.length ? (
        <div className="flex flex-wrap gap-3 mb-6">
          {extraLinks.map((l) => (
            <Link key={l.to} to={l.to} className="text-sm text-purple-700 dark:text-purple-300 underline">
              {l.label}
            </Link>
          ))}
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-8">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-xl border border-gray-200/70 dark:border-gray-800 bg-white/50 dark:bg-black/20 p-4 text-center"
          >
            <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{c.value}</div>
            <div className="text-xs text-gray-500 mt-1">{c.label}</div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2 mb-8">
        <button type="button" className={featBtnPrimary} disabled={busy || !tenantId} onClick={() => void captureSnapshot()}>
          {busy ? 'Saving…' : 'Capture snapshot'}
        </button>
        <button type="button" className={featBtnSecondary} disabled={loading} onClick={() => void refresh()}>
          Refresh stats
        </button>
      </div>

      <section>
        <h2 className="text-sm font-semibold mb-3">Recent snapshots ({snapshotCode})</h2>
        <ul className="rounded-xl border border-gray-200/70 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 text-sm">
          {snapshots.map((s) => (
            <li key={s.id} className="p-3 flex flex-wrap justify-between gap-2">
              <span className="text-gray-600 dark:text-gray-400">{new Date(s.snapshot_at).toLocaleString()}</span>
              <span className="text-xs font-mono text-gray-500">{s.snapshot_scope}</span>
              <pre className="w-full text-[10px] overflow-auto bg-gray-50 dark:bg-black/30 rounded p-2 mt-1">
                {JSON.stringify(s.metrics, null, 2)}
              </pre>
            </li>
          ))}
        </ul>
        {snapshots.length === 0 ? <p className="text-sm text-gray-500 py-4">No snapshots yet — capture one above.</p> : null}
      </section>
    </FeatureShell>
  )
}

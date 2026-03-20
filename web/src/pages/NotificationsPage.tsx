import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { FeatureShell, featBtnSecondary } from '../components/FeatureShell'

type QueueRow = {
  id: string
  recipient: string
  status: string
  queued_at: string
  processed_at: string | null
  try_count: number
  booking_id: string | null
  payload: unknown
}

type LogRow = {
  id: string
  recipient: string
  status: string
  created_at: string
  booking_id: string | null
  payload: unknown
}

const ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

export function NotificationsPage() {
  return (
    <RoleGuard allowedRoles={[...ROLES]}>
      <NotificationsInner />
    </RoleGuard>
  )
}

function NotificationsInner() {
  const [tab, setTab] = useState<'queue' | 'log'>('queue')
  const [queue, setQueue] = useState<QueueRow[]>([])
  const [log, setLog] = useState<LogRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadQueue = useCallback(async () => {
    const { data, error: qErr } = await supabase
      .from('notification_queue')
      .select('id,recipient,status,queued_at,processed_at,try_count,booking_id,payload')
      .order('queued_at', { ascending: false })
      .limit(150)
    if (qErr) throw qErr
    setQueue((data ?? []) as QueueRow[])
  }, [])

  const loadLog = useCallback(async () => {
    const { data, error: qErr } = await supabase
      .from('notification_log')
      .select('id,recipient,status,created_at,booking_id,payload')
      .order('created_at', { ascending: false })
      .limit(150)
    if (qErr) throw qErr
    setLog((data ?? []) as LogRow[])
  }, [])

  const refresh = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      await Promise.all([loadQueue(), loadLog()])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [loadQueue, loadLog])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return (
    <FeatureShell
      title="Notifications"
      description="Outbound queue and delivery log for your tenant."
      error={error}
      onDismissError={() => setError(null)}
    >
      <div className="flex flex-wrap gap-2 mb-4">
        <button
          type="button"
          className={tab === 'queue' ? featBtnSecondary + ' ring-2 ring-purple-500' : featBtnSecondary}
          onClick={() => setTab('queue')}
        >
          Queue ({queue.length})
        </button>
        <button
          type="button"
          className={tab === 'log' ? featBtnSecondary + ' ring-2 ring-purple-500' : featBtnSecondary}
          onClick={() => setTab('log')}
        >
          Log ({log.length})
        </button>
        <button type="button" className={featBtnSecondary} disabled={loading} onClick={() => void refresh()}>
          Refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : tab === 'queue' ? (
        <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800">
          <table className="min-w-[720px] w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="p-2">Queued</th>
                <th className="p-2">Recipient</th>
                <th className="p-2">Status</th>
                <th className="p-2">Tries</th>
                <th className="p-2">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {queue.map((r) => (
                <tr key={r.id}>
                  <td className="p-2 whitespace-nowrap text-gray-600">{new Date(r.queued_at).toLocaleString()}</td>
                  <td className="p-2">{r.recipient}</td>
                  <td className="p-2 font-medium">{r.status}</td>
                  <td className="p-2">{r.try_count}</td>
                  <td className="p-2 max-w-xs">
                    <pre className="text-[10px] overflow-auto max-h-24 bg-gray-50 dark:bg-black/30 rounded p-1">
                      {JSON.stringify(r.payload, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {queue.length === 0 ? <p className="p-4 text-sm text-gray-500">Queue is empty.</p> : null}
        </div>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800">
          <table className="min-w-[640px] w-full text-xs text-left">
            <thead className="bg-gray-50 dark:bg-gray-900/40">
              <tr>
                <th className="p-2">Sent</th>
                <th className="p-2">Recipient</th>
                <th className="p-2">Status</th>
                <th className="p-2">Payload</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {log.map((r) => (
                <tr key={r.id}>
                  <td className="p-2 whitespace-nowrap text-gray-600">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="p-2">{r.recipient}</td>
                  <td className="p-2 font-medium">{r.status}</td>
                  <td className="p-2 max-w-xs">
                    <pre className="text-[10px] overflow-auto max-h-24 bg-gray-50 dark:bg-black/30 rounded p-1">
                      {JSON.stringify(r.payload, null, 2)}
                    </pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {log.length === 0 ? <p className="p-4 text-sm text-gray-500">No log rows yet.</p> : null}
        </div>
      )}
    </FeatureShell>
  )
}

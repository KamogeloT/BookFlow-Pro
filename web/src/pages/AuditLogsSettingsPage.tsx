import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnSecondary, settingsInputClass } from '../components/SettingsShell'

type AuditRow = {
  id: number
  entity_name: string
  entity_id: string | null
  action: string
  actor_user_id: string | null
  before_data: unknown
  after_data: unknown
  created_at: string
}

const SETTINGS_ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

export function AuditLogsSettingsPage() {
  return (
    <RoleGuard allowedRoles={[...SETTINGS_ROLES]}>
      <AuditLogsInner />
    </RoleGuard>
  )
}

function AuditLogsInner() {
  const [rows, setRows] = useState<AuditRow[]>([])
  const [entityFilterDraft, setEntityFilterDraft] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async (entityContains?: string) => {
    setLoading(true)
    setError(null)
    try {
      let q = supabase
        .from('audit_log')
        .select('id,entity_name,entity_id,action,actor_user_id,before_data,after_data,created_at')
        .order('created_at', { ascending: false })
        .limit(200)
      const t = (entityContains ?? '').trim()
      if (t) q = q.ilike('entity_name', `%${t}%`)
      const { data, error: qErr } = await q
      if (qErr) throw qErr
      setRows((data ?? []) as AuditRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit log')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <SettingsShell
      title="Audit Logs"
      description="Recent changes recorded for your tenant (read-only)."
      error={error}
      onDismissError={() => setError(null)}
    >
      <div className="flex flex-wrap gap-3 items-end mb-4">
        <label className="text-sm text-gray-700 dark:text-gray-300 min-w-[200px] flex-1">
          Filter entity name contains
          <input
            className={`mt-1 ${settingsInputClass}`}
            value={entityFilterDraft}
            onChange={(e) => setEntityFilterDraft(e.target.value)}
            placeholder="e.g. booking"
          />
        </label>
        <button
          type="button"
          className={settingsBtnSecondary}
          disabled={loading}
          onClick={() => void load(entityFilterDraft)}
        >
          Apply / refresh
        </button>
      </div>

      {loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800">
          <table className="min-w-[800px] w-full text-xs">
            <thead className="bg-gray-50 dark:bg-gray-900/50 text-left">
              <tr>
                <th className="p-2 font-medium text-gray-600 dark:text-gray-400">When</th>
                <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Entity</th>
                <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Action</th>
                <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Actor</th>
                <th className="p-2 font-medium text-gray-600 dark:text-gray-400">Snapshot</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
              {rows.map((r) => (
                <tr key={r.id} className="align-top">
                  <td className="p-2 whitespace-nowrap text-gray-600 dark:text-gray-400">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <div className="font-mono text-[11px] text-purple-800 dark:text-purple-200">{r.entity_name}</div>
                    <div className="font-mono text-[10px] text-gray-500 break-all">{r.entity_id ?? '—'}</div>
                  </td>
                  <td className="p-2 font-medium">{r.action}</td>
                  <td className="p-2 font-mono text-[10px] break-all text-gray-500">{r.actor_user_id ?? '—'}</td>
                  <td className="p-2 max-w-md">
                    <details className="cursor-pointer">
                      <summary className="text-gray-600 dark:text-gray-400">JSON</summary>
                      <pre className="mt-1 max-h-40 overflow-auto rounded bg-gray-50 dark:bg-black/40 p-2 text-[10px]">
                        {JSON.stringify({ before: r.before_data, after: r.after_data }, null, 2)}
                      </pre>
                    </details>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rows.length === 0 ? <p className="p-4 text-sm text-gray-500">No audit rows match.</p> : null}
        </div>
      )}
    </SettingsShell>
  )
}

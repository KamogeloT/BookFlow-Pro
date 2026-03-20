import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { FeatureShell, featBtnPrimary, featBtnSecondary, featInput } from '../components/FeatureShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type ReportDef = {
  id: string
  code: string
  name: string
  category: string | null
  is_active: boolean
  default_filters: unknown
}

type ReportRun = {
  id: string
  report_definition_id: string | null
  status: string
  rows_count: number
  created_at: string
  filters: unknown
}

const ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher', 'Staff'] as const

export function ReportsPage() {
  return (
    <RoleGuard allowedRoles={[...ROLES]}>
      <ReportsInner />
    </RoleGuard>
  )
}

function ReportsInner() {
  const { tenantId, loading: tLoad, error: tErr } = useTenantProfile()
  const [defs, setDefs] = useState<ReportDef[]>([])
  const [runs, setRuns] = useState<ReportRun[]>([])
  const [selectedDef, setSelectedDef] = useState<string>('')
  const [filtersJson, setFiltersJson] = useState('{}')
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const [dRes, rRes] = await Promise.all([
        supabase.from('report_definitions').select('id,code,name,category,is_active,default_filters').order('code'),
        supabase
          .from('report_runs')
          .select('id,report_definition_id,status,rows_count,created_at,filters')
          .order('created_at', { ascending: false })
          .limit(40),
      ])
      if (dRes.error) throw dRes.error
      if (rRes.error) throw rRes.error
      const dlist = (dRes.data ?? []) as ReportDef[]
      setDefs(dlist)
      setSelectedDef((prev) => prev || dlist[0]?.id || '')
      setRuns((rRes.data ?? []) as ReportRun[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load reports')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function queueRun() {
    if (!tenantId || !selectedDef) return
    let filters: unknown = {}
    try {
      filters = JSON.parse(filtersJson || '{}')
    } catch {
      setError('Filters must be valid JSON')
      return
    }
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const { error: iErr } = await supabase.from('report_runs').insert({
        tenant_id: tenantId,
        report_definition_id: selectedDef,
        filters: filters as object,
        status: 'Queued',
        rows_count: 0,
        result_snapshot: {},
      })
      if (iErr) throw iErr
      setMsg('Run queued (worker processing not wired — row stored for future pipeline).')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Queue failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FeatureShell
      title="Reports"
      description="Report definitions and run history. Execution pipeline can attach to Queued rows later."
      error={error}
      onDismissError={() => setError(null)}
    >
      {msg ? <p className="mb-4 text-sm text-green-700 dark:text-green-400">{msg}</p> : null}

      {tLoad || loading ? (
        <p className="text-sm text-gray-500">Loading…</p>
      ) : tErr ? (
        <p className="text-sm text-red-600">{tErr}</p>
      ) : (
        <div className="grid gap-8 lg:grid-cols-2">
          <section>
            <h2 className="text-sm font-semibold mb-3">Queue a run</h2>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Definition
              <select className={`mt-1 ${featInput}`} value={selectedDef} onChange={(e) => setSelectedDef(e.target.value)}>
                {defs.map((d) => (
                  <option key={d.id} value={d.id} disabled={!d.is_active}>
                    {d.code} — {d.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm text-gray-700 dark:text-gray-300 mb-2">
              Filters (JSON)
              <textarea className={`mt-1 min-h-[100px] font-mono text-xs ${featInput}`} value={filtersJson} onChange={(e) => setFiltersJson(e.target.value)} />
            </label>
            <button type="button" className={featBtnPrimary} disabled={busy || !selectedDef} onClick={() => void queueRun()}>
              Queue run
            </button>
          </section>

          <section>
            <div className="flex justify-between items-center mb-3">
              <h2 className="text-sm font-semibold">Definitions</h2>
              <button type="button" className={featBtnSecondary} onClick={() => void load()}>
                Refresh
              </button>
            </div>
            <ul className="rounded-xl border border-gray-200/70 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 text-sm max-h-64 overflow-auto">
              {defs.map((d) => (
                <li key={d.id} className="p-3">
                  <div className="font-medium">{d.name}</div>
                  <div className="text-xs font-mono text-gray-500">{d.code}</div>
                  {d.category ? <div className="text-xs text-gray-500">{d.category}</div> : null}
                </li>
              ))}
            </ul>
          </section>

          <section className="lg:col-span-2">
            <h2 className="text-sm font-semibold mb-3">Recent runs</h2>
            <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800">
              <table className="min-w-[640px] w-full text-xs text-left">
                <thead className="bg-gray-50 dark:bg-gray-900/40">
                  <tr>
                    <th className="p-2">Created</th>
                    <th className="p-2">Status</th>
                    <th className="p-2">Rows</th>
                    <th className="p-2">Definition</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {runs.map((r) => (
                    <tr key={r.id}>
                      <td className="p-2 whitespace-nowrap">{new Date(r.created_at).toLocaleString()}</td>
                      <td className="p-2 font-medium">{r.status}</td>
                      <td className="p-2">{r.rows_count}</td>
                      <td className="p-2 font-mono text-[10px] break-all">{r.report_definition_id ?? '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {runs.length === 0 ? <p className="p-4 text-sm text-gray-500">No runs yet.</p> : null}
            </div>
          </section>
        </div>
      )}
    </FeatureShell>
  )
}

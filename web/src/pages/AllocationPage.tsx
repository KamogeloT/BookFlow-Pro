import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { FeatureShell, featBtnPrimary, featInput } from '../components/FeatureShell'

type Service = { id: string; name: string; code: string }
type Branch = { id: string; name: string }
type AvailRow = {
  resource_id: string
  resource_code: string | null
  seat_id: string | null
  seat_number: string | null
}

const ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

export function AllocationPage() {
  return (
    <RoleGuard allowedRoles={[...ROLES]}>
      <AllocationInner />
    </RoleGuard>
  )
}

function AllocationInner() {
  const [services, setServices] = useState<Service[]>([])
  const [branches, setBranches] = useState<Branch[]>([])
  const [serviceId, setServiceId] = useState('')
  const [branchId, setBranchId] = useState('')
  const [startLocal, setStartLocal] = useState(() => {
    const d = new Date()
    d.setMinutes(0, 0, 0)
    const pad = (n: number) => String(n).padStart(2, '0')
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
  })
  const [rows, setRows] = useState<AvailRow[]>([])
  const [loading, setLoading] = useState(true)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const [sRes, bRes] = await Promise.all([
          supabase.from('services').select('id,name,code').eq('is_active', true).order('code'),
          supabase.from('branches').select('id,name').order('name'),
        ])
        if (cancelled) return
        if (sRes.error) throw sRes.error
        if (bRes.error) throw bRes.error
        setServices((sRes.data ?? []) as Service[])
        setBranches((bRes.data ?? []) as Branch[])
        setServiceId((prev) => prev || (sRes.data?.[0] as Service | undefined)?.id || '')
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load catalog')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void load()
    return () => {
      cancelled = true
    }
  }, [])

  const runPreview = useCallback(async () => {
    if (!serviceId) return
    setRunning(true)
    setError(null)
    setRows([])
    try {
      const scheduled = new Date(startLocal)
      if (Number.isNaN(scheduled.getTime())) {
        setError('Invalid date/time')
        return
      }
      const { data, error: rErr } = await supabase.rpc('get_available_resources_for_service', {
        p_service_id: serviceId,
        p_branch_id: branchId || null,
        p_scheduled_start: scheduled.toISOString(),
      })
      if (rErr) throw rErr
      setRows((data ?? []) as AvailRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Preview failed (check RPC grants on get_available_resources_for_service).')
    } finally {
      setRunning(false)
    }
  }, [serviceId, branchId, startLocal])

  return (
    <FeatureShell
      title="Allocation"
      description="Preview which resources/seats are available for a service and time window. New bookings still use the Bookings flow (create + allocate)."
      error={error}
      onDismissError={() => setError(null)}
    >
      {loading ? (
        <p className="text-sm text-gray-500">Loading catalog…</p>
      ) : (
        <>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Service
              <select className={`mt-1 ${featInput}`} value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.code} — {s.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700 dark:text-gray-300">
              Branch (optional)
              <select className={`mt-1 ${featInput}`} value={branchId} onChange={(e) => setBranchId(e.target.value)}>
                <option value="">Default from service</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700 dark:text-gray-300 sm:col-span-2">
              Scheduled start (local)
              <input
                type="datetime-local"
                className={`mt-1 ${featInput}`}
                value={startLocal}
                onChange={(e) => setStartLocal(e.target.value)}
              />
            </label>
          </div>
          <div className="flex gap-2 mb-6">
            <button type="button" className={featBtnPrimary} disabled={running || !serviceId} onClick={() => void runPreview()}>
              {running ? 'Running…' : 'Run availability preview'}
            </button>
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800">
            <table className="min-w-[560px] w-full text-sm">
              <thead className="bg-gray-50 dark:bg-gray-900/40 text-left text-xs">
                <tr>
                  <th className="p-2">Resource</th>
                  <th className="p-2">Seat</th>
                  <th className="p-2">Resource ID</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {rows.map((r, i) => (
                  <tr key={`${r.resource_id}-${r.seat_id ?? 'ns'}-${i}`}>
                    <td className="p-2 font-mono text-xs">{r.resource_code ?? r.resource_id}</td>
                    <td className="p-2">{r.seat_number ?? '—'}</td>
                    <td className="p-2 font-mono text-[10px] text-gray-500 break-all">{r.resource_id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!running && rows.length === 0 ? (
              <p className="p-4 text-sm text-gray-500">No rows — run a preview or widen service/resource mapping.</p>
            ) : null}
          </div>
        </>
      )}
    </FeatureShell>
  )
}

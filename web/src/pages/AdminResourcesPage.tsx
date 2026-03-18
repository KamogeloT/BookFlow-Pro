import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'

type Resource = {
  id: string
  code: string
  name: string
  status: string
  capacity: number
  resource_type_id: string
}

type SeatRow = {
  id: string
  seat_number: string
  is_bookable: boolean
}

export function AdminResourcesPage() {
  return (
    <RoleGuard allowedRoles={['Tenant Admin', 'Branch Admin', 'Dispatcher']}>
      <AdminResourcesInner />
    </RoleGuard>
  )
}

function AdminResourcesInner() {
  const [resources, setResources] = useState<Resource[]>([])
  const [selectedResourceId, setSelectedResourceId] = useState<string>('')
  const [seats, setSeats] = useState<SeatRow[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingSeats, setLoadingSeats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadResources() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('resources')
        .select('id,code,name,status,capacity,resource_type_id')
        .order('code', { ascending: true })

      if (error) throw error
      setResources((data ?? []) as Resource[])
      setSelectedResourceId((prev) => prev || (data?.[0]?.id ?? ''))
    }

    loadResources()
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load resources'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    async function loadSeats() {
      if (!selectedResourceId) return
      setLoadingSeats(true)
      setError(null)

      // seat_maps has optional resource_id, so this works for seat-based resources (e.g., vehicles/rooms).
      const { data, error } = await supabase
        .from('seats')
        .select('id,seat_number,is_bookable')
        .eq('seat_maps.resource_id', selectedResourceId)

      // If join syntax doesn't work with this Supabase client config,
      // fall back to a two-step query.
      if (error) {
        const { data: maps } = await supabase
          .from('seat_maps')
          .select('id')
          .eq('resource_id', selectedResourceId)
          .eq('is_active', true)

        const mapId = maps?.[0]?.id as string | undefined
        if (!mapId) {
          setSeats([])
          setLoadingSeats(false)
          return
        }

        const { data: seatData, error: seatError } = await supabase
          .from('seats')
          .select('id,seat_number,is_bookable')
          .eq('seat_map_id', mapId)
          .order('seat_number', { ascending: true })

        if (seatError) throw seatError
        setSeats((seatData ?? []) as SeatRow[])
        setLoadingSeats(false)
        return
      }

      setSeats((data ?? []) as SeatRow[])
      setLoadingSeats(false)
    }

    loadSeats().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load seats'))
  }, [selectedResourceId])

  return (
    <div className="max-w-5xl mx-auto p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm">
      <h1 className="text-2xl font-semibold mb-2">Resources</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Minimal resource management for Phase 1 (read-only list + seat map view).
      </p>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-gray-500">Loading…</div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/60 dark:bg-[#1c1c1e]/45 backdrop-blur p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Resource List</h2>
          {resources.length === 0 ? (
            <div className="text-sm text-gray-500">No resources found (seed data needed).</div>
          ) : (
            <div className="space-y-2">
              <select
                className="w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                value={selectedResourceId}
                onChange={(e) => setSelectedResourceId(e.target.value)}
              >
                {resources.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.code} - {r.name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/60 dark:bg-[#1c1c1e]/45 backdrop-blur p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Seat Map</h2>
          {loadingSeats ? (
            <div className="text-sm text-gray-500">Loading…</div>
          ) : seats.length === 0 ? (
            <div className="text-sm text-gray-500">No seat map for this resource (or none seeded).</div>
          ) : (
            <div className="space-y-2">
              {seats.map((s) => (
                <div key={s.id} className="text-sm flex justify-between">
                  <span className="font-mono">{s.seat_number}</span>
                  <span className="text-gray-500">{s.is_bookable ? 'Bookable' : 'Not bookable'}</span>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


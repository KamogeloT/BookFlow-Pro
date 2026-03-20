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
  const [view, setView] = useState<'catalog' | 'seat-map' | 'availability'>('catalog')
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
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

  const filteredResources = resources.filter((r) => {
    const textOk =
      query.trim().length === 0 ||
      r.code.toLowerCase().includes(query.toLowerCase()) ||
      r.name.toLowerCase().includes(query.toLowerCase())
    const statusOk =
      statusFilter === 'all' ? true : (r.status || '').toLowerCase() === statusFilter
    return textOk && statusOk
  })

  const selectedResource = resources.find((r) => r.id === selectedResourceId)

  return (
    <div className="w-full p-6">
      <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Resources</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Complete UI controls for catalog, seat maps, and availability. Data remains read-only for now.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {(['catalog', 'seat-map', 'availability'] as const).map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setView(tab)}
                className={[
                  'rounded-lg border px-3 py-1',
                  view === tab ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70',
                ].join(' ')}
              >
                {tab === 'seat-map' ? 'Seat Map' : tab[0]!.toUpperCase() + tab.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm shadow-sm">
            {error}
          </div>
        ) : null}

        {loading ? <div className="text-sm text-gray-500">Loading…</div> : null}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/60 dark:bg-[#1c1c1e]/45 backdrop-blur p-4 shadow-sm xl:col-span-1">
            <h2 className="text-sm font-semibold mb-3">Filters</h2>
            <div className="space-y-3">
              <label className="block">
                <span className="text-xs text-gray-600 dark:text-gray-400">Search</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                  placeholder="Code or name"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600 dark:text-gray-400">Status</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
                >
                  <option value="all">All</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </label>
              <label className="block">
                <span className="text-xs text-gray-600 dark:text-gray-400">Selected resource</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                  value={selectedResourceId}
                  onChange={(e) => setSelectedResourceId(e.target.value)}
                >
                  {filteredResources.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.code} - {r.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </section>

          <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/60 dark:bg-[#1c1c1e]/45 backdrop-blur p-4 shadow-sm xl:col-span-2">
            {view === 'catalog' ? (
              <div>
                <h2 className="text-sm font-semibold mb-3">Resource Catalog</h2>
                {filteredResources.length === 0 ? (
                  <div className="text-sm text-gray-500">No resources found.</div>
                ) : (
                  <div className="overflow-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-black/5 dark:bg-white/5">
                        <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                          <th className="p-3">Code</th>
                          <th className="p-3">Name</th>
                          <th className="p-3">Status</th>
                          <th className="p-3">Capacity</th>
                          <th className="p-3">Type</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredResources.map((r) => (
                          <tr
                            key={r.id}
                            className="border-t border-gray-200/70 dark:border-gray-800/70 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5"
                            onClick={() => setSelectedResourceId(r.id)}
                          >
                            <td className="p-3 font-mono">{r.code}</td>
                            <td className="p-3">{r.name}</td>
                            <td className="p-3">{r.status}</td>
                            <td className="p-3">{r.capacity}</td>
                            <td className="p-3 font-mono text-xs">{r.resource_type_id}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            ) : null}

            {view === 'seat-map' ? (
              <div>
                <h2 className="text-sm font-semibold mb-3">Seat Map</h2>
                {loadingSeats ? (
                  <div className="text-sm text-gray-500">Loading…</div>
                ) : seats.length === 0 ? (
                  <div className="text-sm text-gray-500">
                    No seat map for this resource (or none seeded).
                  </div>
                ) : (
                  <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-6 gap-2">
                    {seats.map((s) => (
                      <div
                        key={s.id}
                        className={[
                          'rounded-lg border px-3 py-2 text-sm',
                          s.is_bookable
                            ? 'border-green-200 bg-green-50/70 text-green-800'
                            : 'border-gray-200/70 dark:border-gray-800/70 bg-white/30 dark:bg-[#1c1c1e]/20',
                        ].join(' ')}
                      >
                        <div className="font-mono">{s.seat_number}</div>
                        <div className="text-xs text-gray-500">
                          {s.is_bookable ? 'Bookable' : 'Not bookable'}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : null}

            {view === 'availability' ? (
              <div>
                <h2 className="text-sm font-semibold mb-3">Availability Preview</h2>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
                  <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/30 dark:bg-[#1c1c1e]/20 p-3">
                    <div className="text-xs text-gray-500">Selected</div>
                    <div className="text-sm font-semibold">
                      {selectedResource ? `${selectedResource.code} - ${selectedResource.name}` : 'None'}
                    </div>
                  </div>
                  <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/30 dark:bg-[#1c1c1e]/20 p-3">
                    <div className="text-xs text-gray-500">Capacity</div>
                    <div className="text-sm font-semibold">{selectedResource?.capacity ?? 0}</div>
                  </div>
                  <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/30 dark:bg-[#1c1c1e]/20 p-3">
                    <div className="text-xs text-gray-500">Current status</div>
                    <div className="text-sm font-semibold">{selectedResource?.status ?? '-'}</div>
                  </div>
                </div>
                <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-black/5 dark:bg-white/5 p-3">
                  <div className="text-xs font-semibold mb-2">Week slots (UI preview)</div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                    {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d, i) => (
                      <div
                        key={d}
                        className="rounded-md border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 px-2 py-2"
                      >
                        <div className="font-semibold">{d}</div>
                        <div>{i % 2 === 0 ? '08:00 - 17:00' : 'Limited'}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  )
}


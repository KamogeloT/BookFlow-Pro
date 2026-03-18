import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Service = {
  id: string
  name: string
  duration_minutes: number | null
  is_active: boolean | null
}

type AvailableRow = {
  resource_id: string
  resource_code: string | null
  seat_id: string | null
  seat_number: string | null
}

function toDayWindow(dateISO: string) {
  // dateISO from <input type="date"> is YYYY-MM-DD in local time
  const start = new Date(`${dateISO}T00:00:00`)
  const end = new Date(`${dateISO}T23:59:59`)
  return { start, end }
}

export function CalendarPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const todayISO = useMemo(() => {
    const d = new Date()
    const yyyy = d.getFullYear()
    const mm = String(d.getMonth() + 1).padStart(2, '0')
    const dd = String(d.getDate()).padStart(2, '0')
    return `${yyyy}-${mm}-${dd}`
  }, [])

  const [dateISO, setDateISO] = useState(todayISO)
  const [timeHHMM, setTimeHHMM] = useState('09:00')
  const [serviceId, setServiceId] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const [availability, setAvailability] = useState<AvailableRow[]>([])
  const [availabilityLoading, setAvailabilityLoading] = useState(false)

  const [bookings, setBookings] = useState<
    { id: string; booking_reference: string | null; scheduled_start: string; scheduled_end: string }[]
  >([])

  useEffect(() => {
    async function loadServices() {
      setLoading(true)
      setError(null)
      const { data, error } = await supabase
        .from('services')
        .select('id,name,duration_minutes,is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })

      if (error) throw error
      setServices((data ?? []) as Service[])
      setServiceId((prev) => prev || (data?.[0]?.id ?? ''))
    }

    loadServices().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load services'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    async function loadDayBookings() {
      setError(null)
      const { start, end } = toDayWindow(dateISO)
      const { data, error } = await supabase
        .from('bookings')
        .select('id,booking_reference,scheduled_start,scheduled_end')
        .gte('scheduled_start', start.toISOString())
        .lte('scheduled_end', end.toISOString())
        .order('scheduled_start', { ascending: true })

      if (error) throw error
      setBookings((data ?? []) as typeof bookings)
    }

    loadDayBookings().catch((e) => setError(e instanceof Error ? e.message : 'Failed to load bookings'))
  }, [dateISO])

  const scheduledStart = useMemo(() => {
    // Build a local datetime string and let Postgres interpret it in server TZ.
    // For Phase 1, this is adequate; later we should standardize to UTC.
    return `${dateISO}T${timeHHMM}:00`
  }, [dateISO, timeHHMM])

  async function loadAvailability() {
    setAvailabilityLoading(true)
    setError(null)
    try {
      const { data, error } = await supabase.rpc('get_available_resources_for_service', {
        p_service_id: serviceId,
        p_branch_id: null,
        p_scheduled_start: scheduledStart,
      })
      if (error) throw error
      setAvailability((data ?? []) as AvailableRow[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load availability')
    } finally {
      setAvailabilityLoading(false)
    }
  }

  return (
    <div className="max-w-5xl mx-auto p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm">
      <h1 className="text-2xl font-semibold mb-2">Calendar</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        View bookings for a day and check availability for a selected service/time.
      </p>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm shadow-sm">
          {error}
        </div>
      ) : null}

      {loading ? <div className="text-sm text-gray-500">Loading…</div> : null}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end mb-6">
        <label className="block">
          <span className="text-sm text-gray-700 dark:text-gray-300">Service</span>
          <select
            className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
            value={serviceId}
            onChange={(e) => setServiceId(e.target.value)}
          >
            {services.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="text-sm text-gray-700 dark:text-gray-300">Date</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
          />
        </label>

        <label className="block">
          <span className="text-sm text-gray-700 dark:text-gray-300">Time</span>
          <input
            className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
            type="time"
            value={timeHHMM}
            onChange={(e) => setTimeHHMM(e.target.value)}
          />
        </label>
      </div>

      <div className="flex gap-3 mb-6">
        <button
          disabled={!serviceId || availabilityLoading}
          onClick={loadAvailability}
          className="rounded-lg bg-purple-600 text-white py-2 px-4 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
        >
          {availabilityLoading ? 'Checking…' : 'Check availability'}
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/60 dark:bg-[#1c1c1e]/45 backdrop-blur p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Availability</h2>
          {availability.length === 0 ? (
            <div className="text-sm text-gray-500">No available resources found (or not set up yet).</div>
          ) : (
            <div className="space-y-2">
              {availability.slice(0, 10).map((row) => (
                <div key={`${row.resource_id}-${row.seat_id ?? 'none'}`} className="text-sm flex justify-between">
                  <span className="font-mono">
                    {row.resource_code ?? row.resource_id}
                    {row.seat_number ? ` / seat ${row.seat_number}` : ''}
                  </span>
                  <span className="text-gray-500">{row.seat_id ? 'Seat-based' : 'Resource-based'}</span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/60 dark:bg-[#1c1c1e]/45 backdrop-blur p-4 shadow-sm">
          <h2 className="text-lg font-semibold mb-3">Bookings ({dateISO})</h2>
          {bookings.length === 0 ? (
            <div className="text-sm text-gray-500">No bookings found for this day.</div>
          ) : (
            <div className="space-y-2">
              {bookings.map((b) => (
                <div key={b.id} className="text-sm flex flex-col gap-1 border-b border-gray-100 dark:border-gray-800 pb-2">
                  <div className="font-mono">{b.booking_reference ?? '(no reference yet)'}</div>
                  <div className="text-gray-500">
                    {new Date(b.scheduled_start).toLocaleString()} - {new Date(b.scheduled_end).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}


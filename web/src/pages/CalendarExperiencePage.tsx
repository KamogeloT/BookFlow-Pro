import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Booking = {
  booking_id: string
  booking_reference: string | null
  scheduled_start: string
  scheduled_end: string
  notes?: string | null
  status_name?: string | null
  customer_name?: string | null
  customer_email?: string | null
  service_name?: string | null
}

type ViewMode = 'month' | 'week' | 'day'

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function dateKeyLocal(d: Date) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`
}

function addDays(d: Date, days: number) {
  const x = new Date(d)
  x.setDate(x.getDate() + days)
  return x
}

function startOfWeekMonday(d: Date) {
  const x = new Date(d)
  const day = x.getDay() // 0=Sun..6=Sat
  const diff = day === 0 ? -6 : 1 - day // move back to Monday
  x.setDate(x.getDate() + diff)
  x.setHours(0, 0, 0, 0)
  return x
}

function monthStart(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), 1, 0, 0, 0, 0)
}

function monthAdd(d: Date, deltaMonths: number) {
  return new Date(d.getFullYear(), d.getMonth() + deltaMonths, 1, 0, 0, 0, 0)
}

function fmtShortDate(d: Date) {
  return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
}

function fmtTime(d: Date) {
  return d.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })
}

function fmtDateTime(dISO: string) {
  const d = new Date(dISO)
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export function CalendarExperiencePage() {
  const [viewMode, setViewMode] = useState<ViewMode>('month')
  const [cursorDate, setCursorDate] = useState<Date>(() => new Date())

  const [monthAnchor, setMonthAnchor] = useState<Date>(() => monthStart(new Date()))

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [monthBookings, setMonthBookings] = useState<Booking[]>([])
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedBookingDetail, setSelectedBookingDetail] = useState<Booking | null>(null)
  const [notice, setNotice] = useState<{ kind: 'success' | 'error' | 'info'; message: string } | null>(
    null
  )

  // Keep cursor date inside the current month anchor.
  useEffect(() => {
    const ms = monthStart(cursorDate)
    if (ms.getFullYear() !== monthAnchor.getFullYear() || ms.getMonth() !== monthAnchor.getMonth()) {
      setMonthAnchor(ms)
    }
    // Clear details when switching date.
    setSelectedBookingId(null)
  }, [cursorDate, monthAnchor])

  const monthKey = `${monthAnchor.getFullYear()}-${monthAnchor.getMonth()}`

  useEffect(() => {
    let cancelled = false

    async function loadMonthBookings() {
      setLoading(true)
      setError(null)
      try {
        const start = monthStart(monthAnchor)
        const end = monthAdd(start, 1)
        const { data, error: qErr } = await supabase.rpc('list_bookings_in_range', {
          p_start: start.toISOString(),
          p_end: end.toISOString(),
          p_status: statusFilter === 'All' ? null : statusFilter,
        })

        if (qErr) throw qErr
        if (cancelled) return
        setMonthBookings((data ?? []) as Booking[])
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load bookings')
        setNotice({ kind: 'error', message: 'Failed to refresh calendar bookings.' })
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    loadMonthBookings().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [monthKey, monthAnchor, statusFilter])

  useEffect(() => {
    if (!selectedBookingId) {
      setSelectedBookingDetail(null)
      return
    }
    let cancelled = false
    async function loadDetail() {
      try {
        const { data, error } = await supabase.rpc('get_booking_detail', {
          p_booking_id: selectedBookingId,
        })
        if (error) throw error
        if (cancelled) return
        setSelectedBookingDetail(((data ?? [])[0] ?? null) as Booking | null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load booking detail')
        if (!cancelled) setNotice({ kind: 'error', message: 'Failed to load appointment detail.' })
      }
    }
    loadDetail().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [selectedBookingId])

  const bookingsByDay = useMemo(() => {
    const map = new Map<string, Booking[]>()
    const filtered = monthBookings.filter((b) => {
      const q = searchTerm.trim().toLowerCase()
      if (!q) return true
      return [b.booking_reference ?? '', b.customer_name ?? '', b.customer_email ?? '', b.service_name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    })
    for (const b of filtered) {
      const k = dateKeyLocal(new Date(b.scheduled_start))
      const list = map.get(k) ?? []
      list.push(b)
      map.set(k, list)
    }
    // ensure stable ordering per day
    for (const [k, list] of map.entries()) {
      list.sort(
        (a, c) =>
          new Date(a.scheduled_start).getTime() - new Date(c.scheduled_start).getTime()
      )
      map.set(k, list)
    }
    return map
  }, [monthBookings, searchTerm])

  const cursorDayKey = dateKeyLocal(cursorDate)

  const cursorDayBookings = bookingsByDay.get(cursorDayKey) ?? []

  const selectedBooking = useMemo(() => {
    if (!selectedBookingId) return null
    return monthBookings.find((b) => b.booking_id === selectedBookingId) ?? null
  }, [selectedBookingId, monthBookings])

  const year = monthAnchor.getFullYear()
  const monthIndex = monthAnchor.getMonth()

  const monthLabel = monthAnchor.toLocaleDateString(undefined, { month: 'long' })

  const monthGrid = useMemo(() => {
    const first = new Date(year, monthIndex, 1)
    const gridStart = startOfWeekMonday(first)
    return Array.from({ length: 42 }, (_, i) => addDays(gridStart, i))
  }, [year, monthIndex])

  const weekStart = useMemo(() => startOfWeekMonday(cursorDate), [cursorDate])
  const weekDays = useMemo(() => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)), [weekStart])

  const years = useMemo(() => {
    const nowY = new Date().getFullYear()
    return Array.from({ length: 7 }, (_, i) => nowY - 3 + i)
  }, [])

  function gotoPrevMonth() {
    setMonthAnchor((d) => monthAdd(d, -1))
    setCursorDate((d) => monthAdd(d, -1))
    setSelectedBookingId(null)
  }

  function gotoNextMonth() {
    setMonthAnchor((d) => monthAdd(d, 1))
    setCursorDate((d) => monthAdd(d, 1))
    setSelectedBookingId(null)
  }

  return (
    <div className="w-full p-6">
      <div className="flex items-start justify-between gap-4 mb-4">
        <div className="pl-4">
          <h1 className="text-2xl font-semibold mb-1">Calendar</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Month → Week → Day. Click an appointment to see details.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setNotice({ kind: 'info', message: 'Refreshing calendar...' })
              const ms = monthStart(cursorDate)
              setMonthAnchor(new Date(ms))
            }}
            className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 text-sm hover:opacity-90"
          >
            Refresh
          </button>
          <input
            className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-transparent px-3 py-2 text-sm"
            placeholder="Search ref/customer/service"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <select
            className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-transparent px-3 py-2 text-sm"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            <option>Pending</option>
            <option>Confirmed</option>
            <option>Cancelled</option>
          </select>
          <button
            type="button"
            onClick={() => setViewMode('month')}
            className={[
              'rounded-lg border px-3 py-1 text-sm',
              viewMode === 'month' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70',
            ].join(' ')}
          >
            Month
          </button>
          <button
            type="button"
            onClick={() => setViewMode('week')}
            className={[
              'rounded-lg border px-3 py-1 text-sm',
              viewMode === 'week' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70',
            ].join(' ')}
          >
            Week
          </button>
          <button
            type="button"
            onClick={() => setViewMode('day')}
            className={[
              'rounded-lg border px-3 py-1 text-sm',
              viewMode === 'day' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70',
            ].join(' ')}
          >
            Day
          </button>
        </div>
      </div>

      {/* Month selector + navigation */}
      {notice ? (
        <div
          className={[
            'mb-4 rounded-lg border p-3 text-sm shadow-sm',
            notice.kind === 'success'
              ? 'border-green-200 bg-green-50 text-green-800'
              : notice.kind === 'error'
                ? 'border-red-200 bg-red-50 text-red-700'
                : 'border-blue-200 bg-blue-50 text-blue-700',
          ].join(' ')}
        >
          {notice.message}
        </div>
      ) : null}
      <div className="flex flex-col md:flex-row md:items-center gap-3 justify-between mb-5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={gotoPrevMonth}
            className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90"
          >
            Prev
          </button>
          <button
            type="button"
            onClick={gotoNextMonth}
            className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90"
          >
            Next
          </button>

          <div className="flex items-center gap-2">
            <select
              className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-transparent px-3 py-2 text-sm"
              value={monthIndex}
              onChange={(e) => {
                const m = Number(e.target.value)
                const next = new Date(year, m, 1)
                setMonthAnchor(next)
                setCursorDate((d) => new Date(d.getFullYear(), m, 1))
                setSelectedBookingId(null)
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i).map((i) => (
                <option key={i} value={i}>
                  {new Date(year, i, 1).toLocaleDateString(undefined, { month: 'long' })}
                </option>
              ))}
            </select>

            <select
              className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-transparent px-3 py-2 text-sm"
              value={year}
              onChange={(e) => {
                const y = Number(e.target.value)
                setMonthAnchor(new Date(y, monthIndex, 1))
                setCursorDate((d) => new Date(y, d.getMonth(), d.getDate()))
                setSelectedBookingId(null)
              }}
            >
              {years.map((y) => (
                <option key={y} value={y}>
                  {y}
                </option>
              ))}
            </select>
          </div>

          <div className="text-sm text-gray-600 dark:text-gray-400 ml-1 hidden sm:block">{monthLabel}</div>
        </div>

        <div className="text-xs text-gray-500 dark:text-gray-400">
          {loading ? 'Loading bookings…' : error ? error : ' '}
        </div>
      </div>

      {/* Main view */}
      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm mb-4 flex items-center justify-between gap-3">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => {
              const ms = monthStart(cursorDate)
              setMonthAnchor(new Date(ms))
            }}
            className="rounded-lg border border-red-200 bg-white/70 px-3 py-1 text-xs hover:opacity-90"
          >
            Retry
          </button>
        </div>
      ) : null}

      {viewMode === 'month' ? (
        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white/50 dark:bg-[#1c1c1e]/25 backdrop-blur shadow-sm">
          {loading ? (
            <div className="grid grid-cols-7 gap-1 mb-3">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-4 rounded bg-black/5 dark:bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : null}
          <div className="grid grid-cols-7 gap-1 mb-2 text-xs text-gray-500 dark:text-gray-400">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((d) => (
              <div key={d} className="text-center">
                {d}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1">
            {monthGrid.map((d) => {
              const key = dateKeyLocal(d)
              const inMonth = d.getMonth() === monthIndex
              const dayBookings = bookingsByDay.get(key) ?? []
              const isSelected = key === cursorDayKey

              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => {
                    setCursorDate(new Date(d))
                    setViewMode('day')
                    setSelectedBookingId(null)
                  }}
                  className={[
                    'min-h-24 rounded-lg border p-2 text-left transition',
                    inMonth ? 'border-gray-200/70 dark:border-gray-800/70 bg-white/30 dark:bg-[#1c1c1e]/20' : 'border-gray-200/50 dark:border-gray-800/50 bg-transparent opacity-60',
                    isSelected ? 'border-accent' : '',
                    'hover:opacity-95',
                  ].join(' ')}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-sm font-medium">{d.getDate()}</div>
                    {dayBookings.length > 0 ? (
                      <div className="text-xs text-accent font-semibold">{dayBookings.length}</div>
                    ) : (
                      <div className="text-xs text-transparent">0</div>
                    )}
                  </div>

                  {dayBookings.length > 0 ? (
                    <div className="space-y-1">
                      {dayBookings.slice(0, 3).map((b) => (
                        <div key={b.booking_id} className="text-[11px] text-gray-700 dark:text-gray-200 truncate">
                          {fmtTime(new Date(b.scheduled_start))} {b.booking_reference ? b.booking_reference : ''}
                        </div>
                      ))}
                      {dayBookings.length > 3 ? (
                        <div className="text-[11px] text-gray-500 dark:text-gray-400">+{dayBookings.length - 3} more</div>
                      ) : null}
                    </div>
                  ) : null}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}

      {viewMode === 'week' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2 rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white/50 dark:bg-[#1c1c1e]/25 backdrop-blur shadow-sm">
            <div className="grid grid-cols-7 gap-2 mb-2">
              {weekDays.map((d) => {
                const key = dateKeyLocal(d)
                const dayBookings = bookingsByDay.get(key) ?? []
                const isSelected = key === cursorDayKey

                return (
                  <button
                    key={key}
                    type="button"
                    onClick={() => {
                      setCursorDate(new Date(d))
                      setViewMode('day')
                      setSelectedBookingId(null)
                    }}
                    className={[
                      'rounded-lg border px-2 py-2 text-left hover:opacity-95 transition',
                      isSelected
                        ? 'border-accent bg-white/40 dark:bg-[#1c1c1e]/20'
                        : 'border-gray-200/70 dark:border-gray-800/70 bg-white/20 dark:bg-[#1c1c1e]/15',
                    ].join(' ')}
                  >
                    <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-2 text-center">
                      {d.toLocaleDateString(undefined, { weekday: 'short' })}
                      <span className="ml-1">{d.getDate()}</span>
                    </div>
                    <div className="text-[11px] text-gray-500 dark:text-gray-400 text-center">
                      {dayBookings.length} appt{dayBookings.length === 1 ? '' : 's'}
                    </div>
                  </button>
                )
              })}
            </div>

            <div className="mt-3">
              <div className="text-sm font-semibold mb-2">Appointments</div>
              <div className="space-y-2">
                {weekDays.map((d) => {
                  const key = dateKeyLocal(d)
                  const dayBookings = bookingsByDay.get(key) ?? []
                  if (dayBookings.length === 0) return null

                  return (
                    <div key={key} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 p-3">
                      <div className="text-xs text-gray-500 dark:text-gray-400 mb-2">{fmtShortDate(d)}</div>
                      <div className="space-y-1">
                        {dayBookings.map((b) => (
                          <button
                            key={b.booking_id}
                            type="button"
                            onClick={() => {
                              setCursorDate(new Date(d))
                              setSelectedBookingId(b.booking_id)
                              setViewMode('day')
                            }}
                            className="w-full text-left rounded-md px-2 py-1 hover:bg-black/5 dark:hover:bg-white/5"
                          >
                            <div className="text-sm font-medium">
                              {fmtTime(new Date(b.scheduled_start))}{' '}
                              {b.booking_reference ? b.booking_reference : ''}
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">
                              {fmtTime(new Date(b.scheduled_end))}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  )
                })}
                {weekDays.every((d) => (bookingsByDay.get(dateKeyLocal(d)) ?? []).length === 0) ? (
                  <div className="text-sm text-gray-500">No appointments in this week.</div>
                ) : null}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white/50 dark:bg-[#1c1c1e]/25 backdrop-blur shadow-sm">
            <div className="text-sm font-semibold mb-2">Quick day view</div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">{fmtShortDate(cursorDate)}</div>
            {cursorDayBookings.length === 0 ? (
              <div className="text-sm text-gray-500">No appointments for this day.</div>
            ) : (
              <div className="space-y-2">
                {cursorDayBookings.slice(0, 10).map((b) => (
                  <button
                            key={b.booking_id}
                    type="button"
                    onClick={() => {
                              setSelectedBookingId(b.booking_id)
                      setViewMode('day')
                    }}
                    className="w-full text-left rounded-md border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 hover:bg-black/5 dark:hover:bg-white/5"
                  >
                    <div className="text-sm font-medium">{fmtTime(new Date(b.scheduled_start))}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      {b.booking_reference ?? '(no reference)'}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : null}

      {viewMode === 'day' ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-4">
          <div className="lg:col-span-2 rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white/50 dark:bg-[#1c1c1e]/25 backdrop-blur shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <div className="text-sm text-gray-500 dark:text-gray-400">{fmtShortDate(cursorDate)}</div>
                <div className="text-lg font-semibold">Appointments</div>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('week')
                    setSelectedBookingId(null)
                  }}
                  className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90"
                >
                  Week
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setViewMode('month')
                    setSelectedBookingId(null)
                  }}
                  className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90"
                >
                  Month
                </button>
              </div>
            </div>

            {cursorDayBookings.length === 0 ? (
              <div className="text-sm text-gray-500">No appointments for this day.</div>
            ) : (
              <div className="space-y-2">
                {cursorDayBookings.map((b) => {
                  const isSelected = b.booking_id === selectedBookingId
                  return (
                    <button
                      key={b.booking_id}
                      type="button"
                      onClick={() => setSelectedBookingId(b.booking_id)}
                      className={[
                        'w-full text-left rounded-xl border px-3 py-3 transition',
                        isSelected
                          ? 'border-accent bg-white/40 dark:bg-[#1c1c1e]/20'
                          : 'border-gray-200/70 dark:border-gray-800/70 bg-white/20 dark:bg-[#1c1c1e]/15',
                        'hover:opacity-95',
                      ].join(' ')}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-sm font-semibold">
                            {fmtTime(new Date(b.scheduled_start))} - {fmtTime(new Date(b.scheduled_end))}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {b.booking_reference ?? '(no reference yet)'}
                          </div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">View</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          <div className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white/50 dark:bg-[#1c1c1e]/25 backdrop-blur shadow-sm">
            <div className="text-sm font-semibold mb-2">Appointment Details</div>
            {selectedBooking ? (
              <div className="space-y-3">
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Reference</div>
                  <div className="text-sm font-semibold font-mono">{selectedBooking.booking_reference ?? '(no reference)'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">When</div>
                  <div className="text-sm">
                    {fmtDateTime(selectedBooking.scheduled_start)} - {fmtTime(new Date(selectedBooking.scheduled_end))}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Status</div>
                  <div className="text-sm">{selectedBookingDetail?.status_name ?? selectedBooking.status_name ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Customer</div>
                  <div className="text-sm">
                    {selectedBookingDetail?.customer_name ??
                      selectedBookingDetail?.customer_email ??
                      selectedBooking.customer_name ??
                      selectedBooking.customer_email ??
                      '-'}
                  </div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Service</div>
                  <div className="text-sm">{selectedBookingDetail?.service_name ?? selectedBooking.service_name ?? '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">Notes</div>
                  <div className="text-sm whitespace-pre-wrap">{selectedBookingDetail?.notes ?? selectedBooking.notes ?? '-'}</div>
                </div>
              </div>
            ) : (
              <div className="text-sm text-gray-500">Select an appointment to see details.</div>
            )}
          </div>
        </div>
      ) : null}

      {/* For the month view only, show the selected-day list under the grid */}
      {viewMode === 'month' ? (
        <div className="mt-5 rounded-xl border border-gray-200/70 dark:border-gray-800/70 p-4 bg-white/50 dark:bg-[#1c1c1e]/25 backdrop-blur shadow-sm">
          <div className="flex items-start justify-between gap-3 mb-3">
            <div>
              <div className="text-sm text-gray-500 dark:text-gray-400">{fmtShortDate(cursorDate)}</div>
              <div className="text-lg font-semibold">Appointments</div>
            </div>
            <button
              type="button"
              onClick={() => {
                setViewMode('day')
                setSelectedBookingId(null)
              }}
              className="rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
            >
              Open Day
            </button>
          </div>

          {cursorDayBookings.length === 0 ? (
            <div className="text-sm text-gray-500">No appointments for this day.</div>
          ) : (
            <div className="space-y-2">
              {cursorDayBookings.slice(0, 8).map((b) => (
                <button
                  key={b.booking_id}
                  type="button"
                  onClick={() => {
                    setSelectedBookingId(b.booking_id)
                    setViewMode('day')
                  }}
                  className="w-full text-left rounded-lg border border-gray-200/70 dark:border-gray-800/70 p-3 hover:bg-black/5 dark:hover:bg-white/5"
                >
                  <div className="text-sm font-semibold">
                    {fmtTime(new Date(b.scheduled_start))} - {fmtTime(new Date(b.scheduled_end))}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {b.booking_reference ?? '(no reference)'}
                  </div>
                </button>
              ))}
              {cursorDayBookings.length > 8 ? (
                <div className="text-xs text-gray-500 dark:text-gray-400">+{cursorDayBookings.length - 8} more</div>
              ) : null}
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}


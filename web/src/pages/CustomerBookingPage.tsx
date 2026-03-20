import { useEffect, useMemo, useState } from 'react'
import {
  createBookingWithAllocationCompat,
  type CreateBookingRpcRow,
} from '../lib/createBookingWithAllocationCompat'
import { formatSupabaseError } from '../lib/formatSupabaseError'
import { supabase } from '../lib/supabaseClient'

type Service = {
  id: string
  name: string
  duration_minutes: number | null
  is_active: boolean | null
}

type BookingListItem = {
  booking_id: string
  booking_reference: string | null
  scheduled_start: string
  scheduled_end: string
  notes: string | null
  status_name: string
  customer_name: string | null
  customer_email: string | null
  service_name: string | null
}

type BookingDetail = {
  booking_id: string
  booking_reference: string | null
  scheduled_start: string
  scheduled_end: string
  notes: string | null
  status_name: string
  customer_name: string | null
  customer_email: string | null
  service_name: string | null
  branch_name: string | null
}

type UiNotice = {
  kind: 'success' | 'error' | 'info'
  message: string
}

/** Add next-step hints for common allocation / catalog errors from the booking RPC */
function enrichBookingFailureMessage(raw: string): string {
  if (raw.includes('No active resource type mapped for this service')) {
    return `${raw} Open Settings → Services and link this service to a resource type under “Resource types for booking”. You also need at least one active resource of that type with availability (Settings → Resource management / Admin).`
  }
  if (raw.includes('No available resource found for the requested time')) {
    return `${raw} Pick a different time or ensure a resource of the linked type has availability and is not double-booked.`
  }
  if (raw.includes('Tenant not resolved')) {
    return `${raw} Your account may be missing tenant membership — contact an administrator.`
  }
  return raw
}

function toLocalDateTimeInput(iso: string) {
  const d = new Date(iso)
  const off = d.getTimezoneOffset()
  const local = new Date(d.getTime() - off * 60 * 1000)
  return local.toISOString().slice(0, 16)
}

export function CustomerBookingPage() {
  const [services, setServices] = useState<Service[]>([])
  const [loading, setLoading] = useState(true)

  const [serviceId, setServiceId] = useState<string>('')
  const [scheduledStart, setScheduledStart] = useState('')
  const [notes, setNotes] = useState('')

  const [error, setError] = useState<string | null>(null)
  const [bookingRef, setBookingRef] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [step, setStep] = useState<'details' | 'schedule' | 'review'>('details')
  const [customerName, setCustomerName] = useState('')
  const [customerPhone, setCustomerPhone] = useState('')
  const [branchPref, setBranchPref] = useState('any')
  const [priority, setPriority] = useState('normal')
  const [needsAccessibility, setNeedsAccessibility] = useState(false)
  const [fromDate, setFromDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() - 14)
    return d.toISOString().slice(0, 10)
  })
  const [toDate, setToDate] = useState(() => {
    const d = new Date()
    d.setDate(d.getDate() + 60)
    return d.toISOString().slice(0, 10)
  })
  const [statusFilter, setStatusFilter] = useState('All')
  const [searchTerm, setSearchTerm] = useState('')

  const [bookings, setBookings] = useState<BookingListItem[]>([])
  const [bookingsLoading, setBookingsLoading] = useState(false)
  const [selectedBookingId, setSelectedBookingId] = useState<string | null>(null)
  const [selectedBooking, setSelectedBooking] = useState<BookingDetail | null>(null)
  const [detailLoading, setDetailLoading] = useState(false)
  const [rescheduleStart, setRescheduleStart] = useState('')
  const [rescheduleReason, setRescheduleReason] = useState('')
  const [actionBusy, setActionBusy] = useState(false)
  const [uiNotice, setUiNotice] = useState<UiNotice | null>(null)

  function showNotice(kind: UiNotice['kind'], message: string) {
    setUiNotice({ kind, message })
    const ms =
      kind === 'error' && message.length > 100
        ? 9000
        : kind === 'error'
          ? 6000
          : kind === 'success' && message.length > 140
            ? 10000
            : 3200
    window.setTimeout(() => setUiNotice(null), ms)
  }

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase
        .from('services')
        .select('id,name,duration_minutes,is_active')
        .eq('is_active', true)
        .order('name', { ascending: true })
      if (error) throw error
      setServices((data ?? []) as Service[])
    }

    load()
      .catch((e) => setError(formatSupabaseError(e, 'Failed to load services')))
      .finally(() => setLoading(false))
  }, [])

  async function loadBookings() {
    setBookingsLoading(true)
    setError(null)
    try {
      const startISO = new Date(`${fromDate}T00:00:00`).toISOString()
      const endDate = new Date(`${toDate}T00:00:00`)
      endDate.setDate(endDate.getDate() + 1)
      const endISO = endDate.toISOString()

      const statusArg = statusFilter === 'All' ? null : statusFilter
      const { data, error } = await supabase.rpc('list_bookings_in_range', {
        p_start: startISO,
        p_end: endISO,
        p_status: statusArg,
      })
      if (error) throw error
      setBookings((data ?? []) as BookingListItem[])
      if (!selectedBookingId && (data?.length ?? 0) > 0) {
        setSelectedBookingId(data![0]!.booking_id)
      }
    } catch (e) {
      setError(formatSupabaseError(e, 'Failed to load bookings'))
    } finally {
      setBookingsLoading(false)
    }
  }

  useEffect(() => {
    if (!serviceId && services.length > 0) setServiceId(services[0]!.id)
  }, [serviceId, services])

  // Optional prefill when field still empty (user can override for someone else)
  useEffect(() => {
    let cancelled = false
    async function prefillName() {
      const { data: userData } = await supabase.auth.getUser()
      const user = userData.user
      if (cancelled || !user) return
      const meta = user.user_metadata as { full_name?: string; name?: string } | undefined
      const fromMeta = (meta?.full_name || meta?.name || '').trim()
      const { data: prof } = await supabase
        .from('user_profiles')
        .select('display_name')
        .eq('auth_user_id', user.id)
        .maybeSingle()
      const fromProf = (prof?.display_name ?? '').trim()
      const initial = fromMeta || fromProf
      if (initial) {
        setCustomerName((n) => (n.trim() ? n : initial))
      }
    }
    void prefillName()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    loadBookings().catch(() => undefined)
  }, [fromDate, toDate, statusFilter])

  useEffect(() => {
    if (!selectedBookingId) {
      setSelectedBooking(null)
      return
    }
    let cancelled = false
    async function loadBookingDetail() {
      setDetailLoading(true)
      setError(null)
      try {
        const { data, error } = await supabase.rpc('get_booking_detail', {
          p_booking_id: selectedBookingId,
        })
        if (error) throw error
        if (cancelled) return
        const detail = (data?.[0] ?? null) as BookingDetail | null
        setSelectedBooking(detail)
        if (detail) {
          setRescheduleStart(toLocalDateTimeInput(detail.scheduled_start))
        }
      } catch (e) {
        if (!cancelled) setError(formatSupabaseError(e, 'Failed to load booking detail'))
      } finally {
        if (!cancelled) setDetailLoading(false)
      }
    }
    loadBookingDetail().catch(() => undefined)
    return () => {
      cancelled = true
    }
  }, [selectedBookingId])

  const canSubmit = useMemo(() => {
    return !!serviceId && !!scheduledStart && customerName.trim().length > 0 && !submitting
  }, [serviceId, scheduledStart, customerName, submitting])

  const filteredBookings = useMemo(() => {
    const q = searchTerm.trim().toLowerCase()
    if (!q) return bookings
    return bookings.filter((b) =>
      [b.booking_reference ?? '', b.customer_name ?? '', b.customer_email ?? '', b.service_name ?? '']
        .join(' ')
        .toLowerCase()
        .includes(q)
    )
  }, [bookings, searchTerm])

  async function onConfirm() {
    setError(null)
    setBookingRef(null)
    setSubmitting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user.email
      if (!email) {
        throw new Error(
          'You must be signed in with an email address to book. Try logging out and back in.',
        )
      }
      const nameTrim = customerName.trim()
      if (!nameTrim) throw new Error('Customer name is required.')

      const startDate = new Date(scheduledStart)
      if (Number.isNaN(startDate.getTime())) {
        throw new Error('Pick a valid date and time for the appointment.')
      }
      const scheduledIso = startDate.toISOString()

      // RPC creates booking, customer row (name/phone when DB has migration 0007), allocation, notifications.
      const { data, usedLegacyFiveArgRpc } = await createBookingWithAllocationCompat({
        serviceId,
        branchId: null,
        scheduledIso,
        notes: notes || null,
        email,
        customerName: nameTrim,
        customerPhone: customerPhone.trim() || null,
      })

      const raw = data as CreateBookingRpcRow | CreateBookingRpcRow[] | null
      const row = Array.isArray(raw) ? raw[0] : raw
      setBookingRef(row?.booking_reference ?? null)

      try {
        await loadBookings()
      } catch (refreshErr) {
        const refreshMsg = formatSupabaseError(refreshErr, 'Could not refresh the bookings list')
        setError(
          `Your booking was created, but we could not refresh the list below. ${refreshMsg} You can use Refresh to try again.`,
        )
        showNotice('error', `Booking saved — list refresh failed: ${refreshMsg}`)
        setStep('review')
        return
      }

      setStep('review')
      showNotice(
        'success',
        usedLegacyFiveArgRpc
          ? 'Booking created successfully. Your Supabase project is still on the older booking RPC: name/phone are not saved on the customer until you apply migration 0007_create_booking_customer_name_phone.sql.'
          : 'Booking created successfully.',
      )
    } catch (e) {
      const msg = enrichBookingFailureMessage(formatSupabaseError(e, 'Booking could not be completed'))
      setError(msg)
      showNotice('error', msg)
    } finally {
      setSubmitting(false)
    }
  }

  async function onCancelBooking() {
    if (!selectedBookingId) return
    setActionBusy(true)
    setError(null)
    try {
      const { error } = await supabase.rpc('cancel_booking', {
        p_booking_id: selectedBookingId,
        p_reason: rescheduleReason || null,
      })
      if (error) throw error
      await loadBookings()
      const { data } = await supabase.rpc('get_booking_detail', { p_booking_id: selectedBookingId })
      setSelectedBooking(((data ?? [])[0] ?? null) as BookingDetail | null)
      showNotice('success', 'Booking cancelled.')
    } catch (e) {
      const msg = formatSupabaseError(e, 'Failed to cancel booking')
      setError(msg)
      showNotice('error', msg)
    } finally {
      setActionBusy(false)
    }
  }

  async function onRescheduleBooking() {
    if (!selectedBookingId || !selectedBooking || !rescheduleStart) return
    setActionBusy(true)
    setError(null)
    try {
      const newStart = new Date(rescheduleStart)
      const oldStart = new Date(selectedBooking.scheduled_start)
      const oldEnd = new Date(selectedBooking.scheduled_end)
      const durationMs = Math.max(15 * 60 * 1000, oldEnd.getTime() - oldStart.getTime())
      const newEnd = new Date(newStart.getTime() + durationMs)

      const { error } = await supabase.rpc('reschedule_booking', {
        p_booking_id: selectedBookingId,
        p_new_start: newStart.toISOString(),
        p_new_end: newEnd.toISOString(),
        p_reason: rescheduleReason || null,
      })
      if (error) throw error

      await loadBookings()
      const { data } = await supabase.rpc('get_booking_detail', { p_booking_id: selectedBookingId })
      setSelectedBooking(((data ?? [])[0] ?? null) as BookingDetail | null)
      showNotice('success', 'Booking rescheduled.')
    } catch (e) {
      const msg = formatSupabaseError(e, 'Failed to reschedule booking')
      setError(msg)
      showNotice('error', msg)
    } finally {
      setActionBusy(false)
    }
  }

  return (
    <div className="w-full p-6">
      <div className="rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm p-6">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-semibold mb-2">Book an Appointment</h1>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Full UI is ready: customer details, scheduling, and review. Booking logic remains the same.
            </p>
          </div>
          <div className="flex items-center gap-2 text-sm">
            {(['details', 'schedule', 'review'] as const).map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setStep(s)}
                className={[
                  'rounded-lg border px-3 py-1',
                  step === s ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70',
                ].join(' ')}
              >
                {s[0]!.toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {error ? (
          <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm shadow-sm">
            {error}
          </div>
        ) : null}
        {uiNotice ? (
          <div
            className={[
              'mb-4 rounded-lg border p-3 text-sm shadow-sm',
              uiNotice.kind === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : uiNotice.kind === 'error'
                  ? 'border-red-200 bg-red-50 text-red-700'
                  : 'border-blue-200 bg-blue-50 text-blue-700',
            ].join(' ')}
          >
            {uiNotice.message}
          </div>
        ) : null}
        {bookingRef ? (
          <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-800 p-3 text-sm shadow-sm">
            Booking confirmed: <span className="font-mono">{bookingRef}</span>
          </div>
        ) : null}

        {loading ? <div className="text-sm text-gray-500 mb-4">Loading…</div> : null}

        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="xl:col-span-2 space-y-4">
            <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-[#1c1c1e]/30 p-4">
              <div className="text-sm font-semibold mb-3">Customer & Service</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Customer name</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    placeholder="Full name"
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Phone</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    placeholder="+27..."
                  />
                </label>
                <label className="block md:col-span-2">
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
              </div>
            </section>

            <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-[#1c1c1e]/30 p-4">
              <div className="text-sm font-semibold mb-3">Schedule & Preferences</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <label className="block">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Date & time</span>
                  <input
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    type="datetime-local"
                    value={scheduledStart}
                    onChange={(e) => setScheduledStart(e.target.value)}
                    required
                  />
                </label>
                <label className="block">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Branch preference</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={branchPref}
                    onChange={(e) => setBranchPref(e.target.value)}
                  >
                    <option value="any">Any branch</option>
                    <option value="downtown">Downtown</option>
                    <option value="uptown">Uptown</option>
                  </select>
                </label>
                <label className="block">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Priority</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={priority}
                    onChange={(e) => setPriority(e.target.value)}
                  >
                    <option value="normal">Normal</option>
                    <option value="high">High</option>
                  </select>
                </label>
                <label className="flex items-center justify-between rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/30 dark:bg-[#1c1c1e]/20 px-3 py-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Accessibility support needed</span>
                  <input
                    type="checkbox"
                    checked={needsAccessibility}
                    onChange={(e) => setNeedsAccessibility(e.target.checked)}
                  />
                </label>
                <label className="block md:col-span-2">
                  <span className="text-sm text-gray-700 dark:text-gray-300">Notes (optional)</span>
                  <textarea
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={3}
                    placeholder="Any special instructions…"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-[#1c1c1e]/30 p-4">
              <div className="flex items-start justify-between gap-3 mb-3">
                <div className="text-sm font-semibold">Bookings</div>
                <button
                  type="button"
                  onClick={() => loadBookings()}
                  className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-xs hover:opacity-90"
                >
                  Refresh
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-2 mb-3">
                <input
                  className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2 text-sm"
                  placeholder="Search ref/customer/service"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2 text-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option>All</option>
                  <option>Pending</option>
                  <option>Confirmed</option>
                  <option>Cancelled</option>
                </select>
                <input
                  className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2 text-sm"
                  type="date"
                  value={fromDate}
                  onChange={(e) => setFromDate(e.target.value)}
                />
                <input
                  className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2 text-sm"
                  type="date"
                  value={toDate}
                  onChange={(e) => setToDate(e.target.value)}
                />
              </div>

              {bookingsLoading ? (
                <div className="space-y-2">
                  <div className="h-9 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
                  <div className="h-9 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
                  <div className="h-9 rounded-lg bg-black/5 dark:bg-white/5 animate-pulse" />
                </div>
              ) : filteredBookings.length === 0 ? (
                <div className="text-sm text-gray-500">No bookings found for selected filters.</div>
              ) : (
                <div className="overflow-auto max-h-[340px]">
                  <table className="min-w-full text-sm">
                    <thead className="bg-black/5 dark:bg-white/5 sticky top-0">
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                        <th className="p-3">Ref</th>
                        <th className="p-3">Customer</th>
                        <th className="p-3">Service</th>
                        <th className="p-3">Start</th>
                        <th className="p-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredBookings.map((b) => (
                        <tr
                          key={b.booking_id}
                          onClick={() => setSelectedBookingId(b.booking_id)}
                          className={[
                            'border-t border-gray-200/70 dark:border-gray-800/70 cursor-pointer hover:bg-black/5 dark:hover:bg-white/5',
                            selectedBookingId === b.booking_id ? 'bg-black/5 dark:bg-white/5' : '',
                          ].join(' ')}
                        >
                          <td className="p-3 font-mono text-xs">{b.booking_reference ?? '-'}</td>
                          <td className="p-3">{b.customer_name ?? b.customer_email ?? '-'}</td>
                          <td className="p-3">{b.service_name ?? '-'}</td>
                          <td className="p-3">{new Date(b.scheduled_start).toLocaleString()}</td>
                          <td className="p-3">{b.status_name}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <aside className="space-y-4">
            <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-[#1c1c1e]/30 p-4">
              <div className="text-sm font-semibold mb-3">Booking Summary</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Step</span>
                  <span className="font-medium capitalize">{step}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Service</span>
                  <span className="font-medium">
                    {services.find((s) => s.id === serviceId)?.name ?? 'Not selected'}
                  </span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">When</span>
                  <span className="font-medium">{scheduledStart || 'Not selected'}</span>
                </div>
                <div className="flex justify-between gap-2">
                  <span className="text-gray-500">Priority</span>
                  <span className="font-medium capitalize">{priority}</span>
                </div>
              </div>
            </section>

            <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-[#1c1c1e]/30 p-4">
              <div className="text-sm font-semibold mb-3">Selected Booking</div>
              {detailLoading ? (
                <div className="text-sm text-gray-500">Loading details…</div>
              ) : selectedBooking ? (
                <div className="space-y-3">
                  <div className="text-xs text-gray-500">
                    Ref:{' '}
                    <span className="font-mono text-gray-700 dark:text-gray-200">
                      {selectedBooking.booking_reference ?? '-'}
                    </span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Status: <span className="font-semibold">{selectedBooking.status_name}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Service: <span className="font-semibold">{selectedBooking.service_name ?? '-'}</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    Customer:{' '}
                    <span className="font-semibold">
                      {selectedBooking.customer_name ?? selectedBooking.customer_email ?? '-'}
                    </span>
                  </div>
                  <label className="block">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Reschedule start</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2 text-sm"
                      type="datetime-local"
                      value={rescheduleStart}
                      onChange={(e) => setRescheduleStart(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Reason (optional)</span>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2 text-sm"
                      rows={2}
                      value={rescheduleReason}
                      onChange={(e) => setRescheduleReason(e.target.value)}
                    />
                  </label>
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={actionBusy || !rescheduleStart}
                      onClick={onRescheduleBooking}
                      className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
                    >
                      {actionBusy ? 'Working…' : 'Reschedule Booking'}
                    </button>
                    <button
                      type="button"
                      disabled={actionBusy || selectedBooking.status_name === 'Cancelled'}
                      onClick={onCancelBooking}
                      className="w-full rounded-lg border border-red-200 bg-red-50 text-red-700 py-2 px-3 text-sm hover:opacity-90 disabled:opacity-60"
                    >
                      Cancel Booking
                    </button>
                  </div>
                </div>
              ) : (
                <div className="text-sm text-gray-500">Select a booking from the table.</div>
              )}
            </section>

            <section className="rounded-xl border border-gray-200/70 dark:border-gray-800/70 bg-white/50 dark:bg-[#1c1c1e]/30 p-4">
              <div className="text-sm font-semibold mb-3">Create Actions</div>
              <div className="space-y-2">
                <button
                  disabled={!canSubmit}
                  onClick={onConfirm}
                  className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
                >
                  {submitting ? 'Confirming…' : 'Confirm Booking'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setScheduledStart('')
                    setNotes('')
                    setCustomerName('')
                    setCustomerPhone('')
                  }}
                  className="w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 py-2 px-3 text-sm hover:opacity-90"
                >
                  Reset Form
                </button>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </div>
  )
}


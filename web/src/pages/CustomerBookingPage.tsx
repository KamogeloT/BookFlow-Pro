import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

type Service = {
  id: string
  name: string
  duration_minutes: number | null
  is_active: boolean | null
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
      .catch((e) => setError(e instanceof Error ? e.message : 'Failed to load services'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!serviceId && services.length > 0) setServiceId(services[0]!.id)
  }, [serviceId, services])

  const canSubmit = useMemo(() => {
    return !!serviceId && !!scheduledStart && !submitting
  }, [serviceId, scheduledStart, submitting])

  async function onConfirm() {
    setError(null)
    setBookingRef(null)
    setSubmitting(true)
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      const email = sessionData.session?.user.email
      if (!email) throw new Error('Missing signed-in email.')

      // RPC implemented in Supabase next: creates booking, allocates resource, queues notifications.
      const { data, error: rpcError } = await supabase.rpc('create_booking_with_allocation', {
        p_service_id: serviceId,
        p_branch_id: null,
        p_scheduled_start: scheduledStart,
        p_notes: notes || null,
        p_customer_email: email,
      })
      if (rpcError) throw rpcError
      setBookingRef(data?.booking_reference ?? null)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Booking failed')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6 rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/70 dark:bg-[#1c1c1e]/55 backdrop-blur shadow-sm">
      <h1 className="text-2xl font-semibold mb-2">Book an Appointment</h1>
      <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
        Phase 1: pick a service and time, we auto-allocate a resource and confirm.
      </p>

      {error ? (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 text-sm shadow-sm">
          {error}
        </div>
      ) : null}
      {bookingRef ? (
        <div className="mb-4 rounded-lg border border-green-200 bg-green-50 text-green-800 p-3 text-sm shadow-sm">
          Booking confirmed: <span className="font-mono">{bookingRef}</span>
        </div>
      ) : null}

      {loading ? <div className="text-sm text-gray-500">Loading…</div> : null}

      <div className="space-y-4">
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
          <span className="text-sm text-gray-700 dark:text-gray-300">Notes (optional)</span>
          <textarea
            className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            placeholder="Any special instructions…"
          />
        </label>

        <button
          disabled={!canSubmit}
          onClick={onConfirm}
          className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
        >
          {submitting ? 'Confirming…' : 'Confirm Booking'}
        </button>
      </div>
    </div>
  )
}


import { useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { FeatureShell, featBtnPrimary, featInput } from '../components/FeatureShell'

const ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher', 'Staff'] as const

export function QrCheckinPage() {
  return (
    <RoleGuard allowedRoles={[...ROLES]}>
      <QrInner />
    </RoleGuard>
  )
}

function QrInner() {
  const [ref, setRef] = useState('')
  const [payload, setPayload] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)

  async function checkIn() {
    if (!ref.trim()) {
      setError('Booking reference required')
      return
    }
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const { data, error: rErr } = await supabase.rpc('checkin_booking_by_reference', {
        p_booking_reference: ref.trim(),
        p_qr_payload: payload.trim() || null,
        p_source: 'web',
      })
      if (rErr) throw rErr
      setMsg(`Checked in. Record id: ${data ?? 'ok'}`)
      setPayload('')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Check-in failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <FeatureShell
      title="QR Check-in"
      description="Record a check-in for a booking reference (creates qr_checkins + booking event)."
      error={error}
      onDismissError={() => setError(null)}
    >
      {msg ? <p className="mb-4 text-sm text-green-700 dark:text-green-400">{msg}</p> : null}
      <div className="max-w-md space-y-3">
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          Booking reference
          <input className={`mt-1 ${featInput}`} value={ref} onChange={(e) => setRef(e.target.value)} placeholder="BFP-…" />
        </label>
        <label className="block text-sm text-gray-700 dark:text-gray-300">
          QR payload (optional)
          <input className={`mt-1 ${featInput}`} value={payload} onChange={(e) => setPayload(e.target.value)} />
        </label>
        <button type="button" className={featBtnPrimary} disabled={busy} onClick={() => void checkIn()}>
          {busy ? 'Checking in…' : 'Check in'}
        </button>
      </div>
    </FeatureShell>
  )
}

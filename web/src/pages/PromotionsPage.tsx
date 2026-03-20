import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { FeatureShell, featBtnPrimary, featBtnSecondary, featInput } from '../components/FeatureShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type Campaign = {
  id: string
  code: string
  name: string
  discount_type: string
  discount_value: number
  is_active: boolean
  starts_at: string | null
  ends_at: string | null
}

const ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

export function PromotionsPage() {
  return (
    <RoleGuard allowedRoles={[...ROLES]}>
      <PromotionsInner />
    </RoleGuard>
  )
}

function PromotionsInner() {
  const { tenantId, loading: tLoad, error: tErr } = useTenantProfile()
  const [rows, setRows] = useState<Campaign[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [msg, setMsg] = useState<string | null>(null)
  const [newCamp, setNewCamp] = useState({
    code: '',
    name: '',
    discount_type: 'percentage',
    discount_value: 10,
  })
  const [applyBookingId, setApplyBookingId] = useState('')
  const [applyCode, setApplyCode] = useState('')
  const [applyAmount, setApplyAmount] = useState('0')

  const load = useCallback(async () => {
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('promotion_campaigns')
        .select('id,code,name,discount_type,discount_value,is_active,starts_at,ends_at')
        .order('code')
      if (qErr) throw qErr
      setRows((data ?? []) as Campaign[])
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createCampaign() {
    if (!tenantId || !newCamp.code.trim() || !newCamp.name.trim()) return
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const { error: iErr } = await supabase.from('promotion_campaigns').insert({
        tenant_id: tenantId,
        code: newCamp.code.trim().toUpperCase(),
        name: newCamp.name.trim(),
        discount_type: newCamp.discount_type,
        discount_value: Number(newCamp.discount_value) || 0,
        is_active: true,
      })
      if (iErr) throw iErr
      setNewCamp({ code: '', name: '', discount_type: 'percentage', discount_value: 10 })
      setMsg('Campaign created.')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function toggleActive(c: Campaign) {
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase.from('promotion_campaigns').update({ is_active: !c.is_active }).eq('id', c.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Update failed')
    } finally {
      setBusy(false)
    }
  }

  async function applyCodeToBooking() {
    if (!applyBookingId.trim() || !applyCode.trim()) {
      setError('Booking id and code required')
      return
    }
    setBusy(true)
    setError(null)
    setMsg(null)
    try {
      const { data, error: rErr } = await supabase.rpc('apply_promotion_code', {
        p_booking_id: applyBookingId.trim(),
        p_code: applyCode.trim(),
        p_amount: Number(applyAmount) || 0,
      })
      if (rErr) throw rErr
      setMsg(`Redemption recorded (id: ${data ?? 'ok'}).`)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Apply failed')
    } finally {
      setBusy(false)
    }
  }

  if (tLoad || loading) {
    return (
      <FeatureShell title="Promotions">
        <p className="text-sm text-gray-500">Loading…</p>
      </FeatureShell>
    )
  }
  if (tErr) {
    return <FeatureShell title="Promotions" error={tErr} />
  }

  return (
    <FeatureShell
      title="Promotions"
      description="Campaign codes and applying a code to a booking via apply_promotion_code."
      error={error}
      onDismissError={() => setError(null)}
    >
      {msg ? <p className="mb-4 text-sm text-green-700 dark:text-green-400">{msg}</p> : null}

      <section className="mb-8 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold">New campaign</h2>
          <input className={featInput} placeholder="Code" value={newCamp.code} onChange={(e) => setNewCamp({ ...newCamp, code: e.target.value })} />
          <input className={featInput} placeholder="Name" value={newCamp.name} onChange={(e) => setNewCamp({ ...newCamp, name: e.target.value })} />
          <select
            className={featInput}
            value={newCamp.discount_type}
            onChange={(e) => setNewCamp({ ...newCamp, discount_type: e.target.value })}
          >
            <option value="percentage">percentage</option>
            <option value="fixed">fixed</option>
          </select>
          <input
            type="number"
            className={featInput}
            placeholder="Value"
            value={newCamp.discount_value}
            onChange={(e) => setNewCamp({ ...newCamp, discount_value: Number(e.target.value) })}
          />
          <button type="button" className={featBtnPrimary} disabled={busy} onClick={() => void createCampaign()}>
            Create
          </button>
        </div>
        <div className="rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3">
          <h2 className="text-sm font-semibold">Apply to booking</h2>
          <input
            className={`font-mono text-xs ${featInput}`}
            placeholder="Booking UUID"
            value={applyBookingId}
            onChange={(e) => setApplyBookingId(e.target.value)}
          />
          <input className={featInput} placeholder="Promotion code" value={applyCode} onChange={(e) => setApplyCode(e.target.value)} />
          <input
            type="number"
            className={featInput}
            placeholder="Discount amount (numeric)"
            value={applyAmount}
            onChange={(e) => setApplyAmount(e.target.value)}
          />
          <button type="button" className={featBtnPrimary} disabled={busy} onClick={() => void applyCodeToBooking()}>
            Apply promotion
          </button>
        </div>
      </section>

      <div className="flex justify-end mb-2">
        <button type="button" className={featBtnSecondary} onClick={() => void load()}>
          Refresh
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-gray-200/70 dark:border-gray-800">
        <table className="min-w-[640px] w-full text-xs text-left">
          <thead className="bg-gray-50 dark:bg-gray-900/40">
            <tr>
              <th className="p-2">Code</th>
              <th className="p-2">Name</th>
              <th className="p-2">Type</th>
              <th className="p-2">Value</th>
              <th className="p-2">Active</th>
              <th className="p-2"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
            {rows.map((r) => (
              <tr key={r.id}>
                <td className="p-2 font-mono font-medium">{r.code}</td>
                <td className="p-2">{r.name}</td>
                <td className="p-2">{r.discount_type}</td>
                <td className="p-2">{r.discount_value}</td>
                <td className="p-2">{r.is_active ? 'yes' : 'no'}</td>
                <td className="p-2">
                  <button type="button" className="text-purple-700 dark:text-purple-300 underline text-xs" disabled={busy} onClick={() => void toggleActive(r)}>
                    Toggle
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 ? <p className="p-4 text-sm text-gray-500">No campaigns.</p> : null}
      </div>
    </FeatureShell>
  )
}

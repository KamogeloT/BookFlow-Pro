import { supabase } from './supabaseClient'

export type CreateBookingRpcRow = {
  booking_id: string
  booking_reference: string | null
}

export type CreateBookingCompatParams = {
  serviceId: string
  branchId: string | null
  scheduledIso: string
  notes: string | null
  email: string
  customerName: string
  customerPhone: string | null
}

function isCreateBookingSchemaMismatch(err: unknown): boolean {
  if (!err || typeof err !== 'object') return false
  const e = err as { code?: string; message?: string }
  return (
    e.code === 'PGRST202' &&
    typeof e.message === 'string' &&
    e.message.includes('create_booking_with_allocation')
  )
}

/**
 * Calls `create_booking_with_allocation` using the latest 7-arg signature when the DB has it;
 * falls back to the original 5-arg RPC (migration 0002 shape) when PostgREST reports PGRST202.
 * After fallback, name/phone are not persisted by the RPC until migration 0007 is applied.
 */
export async function createBookingWithAllocationCompat(
  params: CreateBookingCompatParams,
): Promise<{ data: unknown; usedLegacyFiveArgRpc: boolean }> {
  const {
    serviceId,
    branchId,
    scheduledIso,
    notes,
    email,
    customerName,
    customerPhone,
  } = params

  const { data, error } = await supabase.rpc('create_booking_with_allocation', {
    p_service_id: serviceId,
    p_branch_id: branchId,
    p_scheduled_start: scheduledIso,
    p_notes: notes,
    p_customer_email: email,
    p_customer_name: customerName,
    p_customer_phone: customerPhone,
  })

  if (!error) {
    return { data, usedLegacyFiveArgRpc: false }
  }

  if (isCreateBookingSchemaMismatch(error)) {
    const second = await supabase.rpc('create_booking_with_allocation', {
      p_service_id: serviceId,
      p_branch_id: branchId,
      p_scheduled_start: scheduledIso,
      p_notes: notes,
      p_customer_email: email,
    })
    if (second.error) throw second.error
    return { data: second.data, usedLegacyFiveArgRpc: true }
  }

  throw error
}

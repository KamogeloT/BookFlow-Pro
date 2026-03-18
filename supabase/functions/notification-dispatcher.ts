// Supabase Edge Function: notification dispatcher (Phase 1 stub)
// Reads queued notifications from `notification_queue`, attempts delivery via
// a provider (email/SMS), and writes results to `notification_log`.
//
// This is intentionally a scaffold; wire to your provider of choice.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

type NotificationQueueRow = {
  id: string
  tenant_id: string
  channel_id: string | null
  booking_id: string | null
  recipient: string
  payload: Record<string, unknown>
  status: string
  try_count: number
}

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? ''
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''

const EMAIL_SMTP_HOST = Deno.env.get('EMAIL_SMTP_HOST') ?? ''
const EMAIL_SMTP_USER = Deno.env.get('EMAIL_SMTP_USER') ?? ''
const EMAIL_SMTP_PASS = Deno.env.get('EMAIL_SMTP_PASS') ?? ''

// NOTE: This dispatcher is a stub: it does not actually send email yet.
async function attemptSendEmail(_row: NotificationQueueRow, _payload: any) {
  // Replace with nodemailer or provider SDK.
  return { sent: false, reason: 'Email provider not configured yet.' }
}

Deno.serve(async (_req) => {
  if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    return new Response('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY', { status: 500 })
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)

  // Fetch a small batch of queued notifications.
  const { data: queueRows, error: queueErr } = await supabase
    .from('notification_queue')
    .select('id,tenant_id,channel_id,booking_id,recipient,payload,status,try_count')
    .eq('status', 'Queued')
    .order('queued_at', { ascending: true })
    .limit(10)

  if (queueErr) {
    return new Response(queueErr.message, { status: 500 })
  }

  if (!queueRows || queueRows.length === 0) {
    return new Response('No queued notifications', { status: 200 })
  }

  // Process sequentially for simplicity (Phase 1).
  for (const row of queueRows as NotificationQueueRow[]) {
    try {
      // In a real implementation, read channel_type from notification_channels
      // and choose email/SMS/in-app delivery.
      const result = await attemptSendEmail(row, row.payload)

      const nextStatus = result.sent ? 'Sent' : 'Failed'

      await supabase.from('notification_queue').update({
        status: nextStatus,
        processed_at: new Date().toISOString(),
        try_count: row.try_count + 1,
      }).eq('id', row.id)

      await supabase.from('notification_log').insert({
        tenant_id: row.tenant_id,
        channel_id: row.channel_id,
        booking_id: row.booking_id,
        recipient: row.recipient,
        payload: row.payload,
        status: nextStatus,
      })
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Notification dispatch failed'
      await supabase.from('notification_queue').update({
        status: 'Failed',
        processed_at: new Date().toISOString(),
        try_count: row.try_count + 1,
      }).eq('id', row.id)

      await supabase.from('notification_log').insert({
        tenant_id: row.tenant_id,
        channel_id: row.channel_id,
        booking_id: row.booking_id,
        recipient: row.recipient,
        payload: row.payload,
        status: 'Failed',
      })

      // eslint-disable-next-line no-console
      console.warn(msg)
    }
  }

  return new Response('Notification dispatch completed', { status: 200 })
})


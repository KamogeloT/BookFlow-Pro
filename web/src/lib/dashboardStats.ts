import type { SupabaseClient } from '@supabase/supabase-js'

function startEndUtcToday() {
  const start = new Date()
  start.setHours(0, 0, 0, 0)
  const end = new Date(start)
  end.setDate(end.getDate() + 1)
  return { start: start.toISOString(), end: end.toISOString() }
}

export type DashboardStats = {
  bookingsToday: number
  waitlistOpen: number
  notificationsQueued: number
  feedbackOpen: number
}

export async function fetchDashboardStats(client: SupabaseClient): Promise<DashboardStats> {
  const { start, end } = startEndUtcToday()

  const [b, w, n, f] = await Promise.all([
    client
      .from('bookings')
      .select('id', { count: 'exact', head: true })
      .gte('scheduled_start', start)
      .lt('scheduled_start', end),
    client
      .from('waitlists')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Pending', 'Waiting']),
    client
      .from('notification_queue')
      .select('id', { count: 'exact', head: true })
      .in('status', ['Queued', 'Pending']),
    client.from('feedback_entries').select('id', { count: 'exact', head: true }).eq('status', 'Open'),
  ])

  return {
    bookingsToday: b.count ?? 0,
    waitlistOpen: w.count ?? 0,
    notificationsQueued: n.count ?? 0,
    feedbackOpen: f.count ?? 0,
  }
}

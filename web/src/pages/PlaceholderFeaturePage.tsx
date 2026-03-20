import { useMemo, useState } from 'react'

type PlaceholderFeaturePageProps = {
  title: string
  subtitle?: string
}

type ToastKind = 'success' | 'error' | 'info'

function Toast({ kind, message }: { kind: ToastKind; message: string }) {
  const cls =
    kind === 'success'
      ? 'border-green-200 bg-green-50 text-green-800'
      : kind === 'error'
        ? 'border-red-200 bg-red-50 text-red-700'
        : 'border-blue-200 bg-blue-50 text-blue-700'

  return <div className={`mb-4 rounded-lg border p-3 text-sm shadow-sm ${cls}`}>{message}</div>
}

function Card({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div
      className={[
        'rounded-xl border border-gray-200/70 dark:border-gray-800/70',
        'bg-white/50 dark:bg-[#1c1c1e]/25 backdrop-blur shadow-sm',
        className ?? 'p-4',
      ].join(' ')}
    >
      {children}
    </div>
  )
}

export function PlaceholderFeaturePage({ title, subtitle }: PlaceholderFeaturePageProps) {
  const normalized = title.toLowerCase()

  const kind = useMemo(() => {
    if (normalized.includes('allocation')) return 'allocation'
    if (normalized.includes('notification')) return 'notifications'
    if (normalized.includes('reports')) return 'reports'
    if (normalized.includes('dashboard')) return 'dashboard'
    if (normalized.includes('branding') || normalized.includes('themes')) return 'branding'
    if (normalized === 'tenants') return 'tenants'
    if (normalized.includes('roles')) return 'roles'
    if (normalized.includes('services')) return 'services'
    if (normalized.includes('resource')) return 'resource-management'
    if (normalized.includes('allocation rules')) return 'allocation-rules'
    if (normalized.includes('webhooks')) return 'webhooks'
    if (normalized.includes('app settings')) return 'app-settings'
    if (normalized.includes('audit logs')) return 'audit-logs'
    if (normalized.includes('waitlists') || normalized.includes('waitlist')) return 'waitlists'
    if (normalized.includes('qr')) return 'qr-checkin'
    if (normalized.includes('promotions')) return 'promotions'
    if (normalized.includes('feedback')) return 'feedback'
    if (normalized.includes('api')) return 'api-integrations'

    // Fallback: generic settings page UI.
    return 'generic'
  }, [normalized])

  const [toast, setToast] = useState<{ kind: ToastKind; message: string } | null>(null)
  const showToast = (t: { kind: ToastKind; message: string }) => {
    setToast(t)
    window.setTimeout(() => setToast(null), 2200)
  }

  // Common demo state
  const [busy, setBusy] = useState(false)
  const runDemo = async (label: string) => {
    setBusy(true)
    try {
      await new Promise((r) => window.setTimeout(r, 650))
      showToast({ kind: 'success', message: `${label} completed (demo).` })
    } finally {
      setBusy(false)
    }
  }

  // Generic UI
  const [overviewTab, setOverviewTab] = useState<'overview' | 'manage' | 'activity'>('overview')

  // Allocation UI state
  const [allocService, setAllocService] = useState('svc-1')
  const [allocStart, setAllocStart] = useState('2026-03-01')
  const [allocEnd, setAllocEnd] = useState('2026-03-31')
  const [allocBranch, setAllocBranch] = useState('all')
  const [allocResourceType, setAllocResourceType] = useState('any')
  const [allocStrategy, setAllocStrategy] = useState('balanced')
  const [allocRespectCapacity, setAllocRespectCapacity] = useState(true)
  const [allocAvoidOverlap, setAllocAvoidOverlap] = useState(true)
  const [allocPreferMatch, setAllocPreferMatch] = useState(true)
  const [allocResultsSeed, setAllocResultsSeed] = useState(0)

  const allocationResults = useMemo(() => {
    const base =
      allocResourceType === 'any'
        ? 14
        : allocResourceType === 'room'
          ? 9
          : allocResourceType === 'vehicle'
            ? 6
            : 8

    const candidate = base + (allocBranch === 'all' ? 4 : 1) + (allocRespectCapacity ? 2 : 0)
    const conflicts = Math.max(0, Math.round(candidate * 0.12) - (allocAvoidOverlap ? 1 : 0))
    const created = Math.max(0, candidate - conflicts - 1)
    const unallocated = Math.max(0, candidate - created)

    const rows = Array.from({ length: Math.min(8, candidate) }, (_, i) => {
      const idx = i + 1 + (allocPreferMatch ? 0 : 1)
      const capacity = idx * 5 + (allocStrategy === 'round-robin' ? 2 : 0)
      const avail = Math.max(0, Math.round(capacity * 0.72) - conflicts)
      const allocated = Math.max(0, Math.min(avail, Math.round(avail * 0.88)))
      return {
        id: `r-${allocResourceType}-${idx}`,
        code: allocResourceType === 'any' ? `R-${100 + idx}` : `R-${allocResourceType}-${idx}`,
        type: allocResourceType === 'any' ? 'Mixed' : allocResourceType,
        capacity,
        available: avail,
        allocated,
        notes: allocated > avail * 0.9 ? 'High utilization' : 'Within capacity',
      }
    })

    return {
      candidate,
      conflicts,
      created,
      unallocated,
      rows,
      seed: allocResultsSeed,
    }
  }, [
    allocBranch,
    allocAvoidOverlap,
    allocPreferMatch,
    allocResourceType,
    allocRespectCapacity,
    allocResultsSeed,
    allocStrategy,
  ])

  // Notifications UI state
  const [notifTab, setNotifTab] = useState<'templates' | 'queue' | 'history'>('templates')
  const [templateId, setTemplateId] = useState('t-1')
  const [notifChannel, setNotifChannel] = useState('email')
  const [notifTrigger, setNotifTrigger] = useState('booking_confirmed')
  const [notifSubject, setNotifSubject] = useState('Your booking is confirmed')
  const [notifBody, setNotifBody] = useState(
    'Hi {{customer_name}},\\n\\nYour appointment {{booking_reference}} is confirmed for {{scheduled_start}}.\\n'
  )
  const [queueFilterStatus, setQueueFilterStatus] = useState<'pending' | 'sent' | 'failed' | 'all'>('pending')

  // Reports UI state
  const [reportTab, setReportTab] = useState<'bookings' | 'allocations' | 'utilization'>('bookings')
  const [reportStart, setReportStart] = useState('2026-03-01')
  const [reportEnd, setReportEnd] = useState('2026-03-31')
  const [reportGroupBy, setReportGroupBy] = useState<'day' | 'week' | 'resource'>('week')

  // Settings UI state (reused)
  const [nameDraft, setNameDraft] = useState('')
  const [statusDraft, setStatusDraft] = useState<'active' | 'inactive'>('active')
  const [notesDraft, setNotesDraft] = useState('')
  const [editorBusy, setEditorBusy] = useState(false)

  const saveSettingsDemo = async () => {
    setEditorBusy(true)
    try {
      await new Promise((r) => window.setTimeout(r, 550))
      showToast({ kind: 'success', message: 'Saved (demo).' })
    } finally {
      setEditorBusy(false)
    }
  }

  const subtitleText =
    subtitle ??
    'Complete UI controls are ready here. Business rules will be wired up after Phase 1.'

  return (
    <div className="w-full p-6">
      {toast ? <Toast kind={toast.kind} message={toast.message} /> : null}

      <div className="flex items-start justify-between gap-4 mb-4">
        <div>
          <h1 className="text-2xl font-semibold mb-1">{title}</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">{subtitleText}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap justify-end">
          <button
            type="button"
            onClick={() => runDemo('Export')}
            disabled={busy}
            className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60"
          >
            Export
          </button>
          <button
            type="button"
            onClick={() => runDemo('Save')}
            disabled={busy}
            className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity"
          >
            {busy ? 'Working…' : 'Save (demo)'}
          </button>
        </div>
      </div>

      {kind === 'allocation' ? (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
          <div className="space-y-4 xl:col-span-1">
            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Allocation Inputs</div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Service</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={allocService}
                    onChange={(e) => setAllocService(e.target.value)}
                  >
                    <option value="svc-1">Initial Consultation</option>
                    <option value="svc-2">Follow-up Visit</option>
                    <option value="svc-3">Group Session</option>
                  </select>
                </label>

                <div className="grid grid-cols-2 gap-3">
                  <label className="block">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Start</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                      type="date"
                      value={allocStart}
                      onChange={(e) => setAllocStart(e.target.value)}
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600 dark:text-gray-300">End</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                      type="date"
                      value={allocEnd}
                      onChange={(e) => setAllocEnd(e.target.value)}
                    />
                  </label>
                </div>

                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Branch</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={allocBranch}
                    onChange={(e) => setAllocBranch(e.target.value)}
                  >
                    <option value="all">All branches</option>
                    <option value="br-downtown">Downtown</option>
                    <option value="br-uptown">Uptown</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Resource type</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={allocResourceType}
                    onChange={(e) => setAllocResourceType(e.target.value)}
                  >
                    <option value="any">Any</option>
                    <option value="room">Room</option>
                    <option value="staff">Staff</option>
                    <option value="vehicle">Vehicle</option>
                  </select>
                </label>
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Allocation Strategy</div>

              <div className="space-y-3">
                <label className="block">
                  <span className="text-xs text-gray-600 dark:text-gray-300">Strategy</span>
                  <select
                    className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={allocStrategy}
                    onChange={(e) => setAllocStrategy(e.target.value)}
                  >
                    <option value="balanced">Balanced Allocation</option>
                    <option value="maximize-availability">Maximize Availability</option>
                    <option value="round-robin">Round Robin</option>
                  </select>
                </label>

                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">Respect Capacity</span>
                    <input
                      type="checkbox"
                      checked={allocRespectCapacity}
                      onChange={(e) => setAllocRespectCapacity(e.target.checked)}
                    />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">Avoid Overlap</span>
                    <input type="checkbox" checked={allocAvoidOverlap} onChange={(e) => setAllocAvoidOverlap(e.target.checked)} />
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-sm">Prefer Matching Skills</span>
                    <input type="checkbox" checked={allocPreferMatch} onChange={(e) => setAllocPreferMatch(e.target.checked)} />
                  </div>
                </div>

                <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-black/5 dark:bg-white/5 p-3">
                  <div className="text-xs font-semibold mb-1">Concurrency</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    Preview uses demo data. When logic is enabled, server-side locking will prevent race conditions.
                  </div>
                </div>

                <button
                  type="button"
                  disabled={busy}
                  onClick={async () => {
                    setAllocResultsSeed((s) => s + 1)
                    await runDemo('Allocation preview')
                  }}
                  className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
                >
                  {busy ? 'Running…' : 'Run Allocation Preview'}
                </button>
              </div>
            </Card>
          </div>

          <div className="space-y-4 xl:col-span-2">
            <Card className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-sm font-semibold mb-2">Preview Summary</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300">
                    {allocStart} → {allocEnd} • {allocBranch === 'all' ? 'All branches' : allocBranch} •{' '}
                    {allocResourceType === 'any' ? 'Any type' : allocResourceType}
                  </div>
                </div>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runDemo('Generate Allocation Report')}
                  className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60"
                >
                  Generate Report
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mt-4">
                <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Candidate resources</div>
                  <div className="text-lg font-semibold">{allocationResults.candidate}</div>
                </div>
                <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Conflicts detected</div>
                  <div className="text-lg font-semibold">{allocationResults.conflicts}</div>
                </div>
                <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Allocations created</div>
                  <div className="text-lg font-semibold">{allocationResults.created}</div>
                </div>
                <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 p-3">
                  <div className="text-xs text-gray-500 dark:text-gray-400">Unallocated</div>
                  <div className="text-lg font-semibold">{allocationResults.unallocated}</div>
                </div>
              </div>
            </Card>

            <Card className="p-0 overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-800/70 flex items-center justify-between gap-3">
                <div className="text-sm font-semibold">Candidate Resources</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  Seed: <span className="font-mono">{allocationResults.seed}</span>
                </div>
              </div>

              <div className="overflow-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/5 dark:bg-white/5">
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <th className="p-3">Resource</th>
                      <th className="p-3">Type</th>
                      <th className="p-3">Capacity</th>
                      <th className="p-3">Available</th>
                      <th className="p-3">Allocated</th>
                      <th className="p-3">Notes</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allocationResults.rows.map((r) => (
                      <tr key={r.id} className="border-t border-gray-200/70 dark:border-gray-800/70">
                        <td className="p-3 font-mono">{r.code}</td>
                        <td className="p-3">{r.type}</td>
                        <td className="p-3">{r.capacity}</td>
                        <td className="p-3">{r.available}</td>
                        <td className="p-3">{r.allocated}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-300">{r.notes}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {kind === 'notifications' ? (
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => setNotifTab('templates')}
              className={`rounded-lg border px-3 py-1 text-sm ${notifTab === 'templates' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              Templates
            </button>
            <button
              type="button"
              onClick={() => setNotifTab('queue')}
              className={`rounded-lg border px-3 py-1 text-sm ${notifTab === 'queue' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              Queue
            </button>
            <button
              type="button"
              onClick={() => setNotifTab('history')}
              className={`rounded-lg border px-3 py-1 text-sm ${notifTab === 'history' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              History
            </button>
          </div>

          {notifTab === 'templates' ? (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
              <div className="xl:col-span-1 space-y-4">
                <Card className="p-4">
                  <div className="text-sm font-semibold mb-3">Template Library</div>
                  <select
                    className="w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                    value={templateId}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    <option value="t-1">Booking Confirmed (Email)</option>
                    <option value="t-2">Booking Cancelled (Email)</option>
                    <option value="t-3">Reminder (SMS)</option>
                  </select>
                  <div className="mt-3 text-xs text-gray-600 dark:text-gray-300">
                    Variables are supported: <span className="font-mono">{"{{customer_name}}"}</span>, <span className="font-mono">{"{{booking_reference}}"}</span>,{" "}
                    <span className="font-mono">{"{{scheduled_start}}"}</span>
                  </div>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => runDemo('Create template')}
                    className="mt-4 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
                  >
                    New Template
                  </button>
                </Card>
              </div>

              <div className="xl:col-span-2 space-y-4">
                <Card className="p-4">
                  <div className="text-sm font-semibold mb-3">Editor</div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <label className="block">
                      <span className="text-xs text-gray-600 dark:text-gray-300">Channel</span>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                        value={notifChannel}
                        onChange={(e) => setNotifChannel(e.target.value)}
                      >
                        <option value="email">Email</option>
                        <option value="sms">SMS</option>
                        <option value="push">Push</option>
                      </select>
                    </label>
                    <label className="block">
                      <span className="text-xs text-gray-600 dark:text-gray-300">Trigger/Event</span>
                      <select
                        className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                        value={notifTrigger}
                        onChange={(e) => setNotifTrigger(e.target.value)}
                      >
                        <option value="booking_confirmed">Booking Confirmed</option>
                        <option value="booking_cancelled">Booking Cancelled</option>
                        <option value="booking_reminder">Booking Reminder</option>
                      </select>
                    </label>
                  </div>

                  <label className="block mt-3">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Subject</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                      value={notifSubject}
                      onChange={(e) => setNotifSubject(e.target.value)}
                    />
                  </label>

                  <label className="block mt-3">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Body</span>
                    <textarea
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                      rows={8}
                      value={notifBody}
                      onChange={(e) => setNotifBody(e.target.value)}
                    />
                  </label>

                  <div className="mt-4 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => runDemo('Preview notification')}
                      disabled={busy}
                      className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60"
                    >
                      Preview
                    </button>
                    <button
                      type="button"
                      onClick={() => runDemo('Save template')}
                      disabled={busy}
                      className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity"
                    >
                      {busy ? 'Saving…' : 'Save Template'}
                    </button>
                  </div>
                </Card>
              </div>
            </div>
          ) : null}

          {notifTab === 'queue' ? (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="flex items-start justify-between gap-4 flex-wrap">
                  <div>
                    <div className="text-sm font-semibold mb-2">Notification Queue</div>
                    <div className="text-xs text-gray-600 dark:text-gray-300">
                      Preview only. When logic is enabled, notifications will be dispatched via a trusted backend.
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runDemo('Dispatch pending')}
                      className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity"
                    >
                      Dispatch Pending
                    </button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => runDemo('Send test')}
                      className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60"
                    >
                      Send Test
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-3">
                  <label className="block">
                    <span className="text-xs text-gray-600 dark:text-gray-300">Status</span>
                    <select
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                      value={queueFilterStatus}
                      onChange={(e) => setQueueFilterStatus(e.target.value as typeof queueFilterStatus)}
                    >
                      <option value="pending">Pending</option>
                      <option value="sent">Sent</option>
                      <option value="failed">Failed</option>
                      <option value="all">All</option>
                    </select>
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600 dark:text-gray-300">From</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                      type="date"
                      value={'2026-03-01'}
                      readOnly
                    />
                  </label>
                  <label className="block">
                    <span className="text-xs text-gray-600 dark:text-gray-300">To</span>
                    <input
                      className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                      type="date"
                      value={'2026-03-31'}
                      readOnly
                    />
                  </label>
                </div>
              </Card>

              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-800/70 text-sm font-semibold">
                  Queue Items
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-black/5 dark:bg-white/5">
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                        <th className="p-3">Event</th>
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Channel</th>
                        <th className="p-3">Status</th>
                        <th className="p-3">Created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 8 }, (_, i) => {
                        const status =
                          queueFilterStatus === 'all'
                            ? (i % 3 === 0 ? 'failed' : i % 3 === 1 ? 'sent' : 'pending')
                            : queueFilterStatus
                        return (
                          <tr key={i} className="border-t border-gray-200/70 dark:border-gray-800/70">
                            <td className="p-3">{i % 2 === 0 ? 'booking_confirmed' : 'booking_reminder'}</td>
                            <td className="p-3 font-mono">user{i + 1}@example.com</td>
                            <td className="p-3">{i % 2 === 0 ? 'email' : 'sms'}</td>
                            <td className="p-3">{status}</td>
                            <td className="p-3 text-gray-600 dark:text-gray-300">
                              2026-03-{String(2 + i).padStart(2, '0')} 09:1{i}:00
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}

          {notifTab === 'history' ? (
            <div className="space-y-4">
              <Card className="p-4">
                <div className="text-sm font-semibold mb-2">Dispatch History</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Track send attempts, failures, and retries (demo UI).</div>
              </Card>
              <Card className="p-0 overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-200/70 dark:border-gray-800/70 text-sm font-semibold">
                  Attempts
                </div>
                <div className="overflow-auto">
                  <table className="min-w-full text-sm">
                    <thead className="bg-black/5 dark:bg-white/5">
                      <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                        <th className="p-3">Template</th>
                        <th className="p-3">Recipient</th>
                        <th className="p-3">Result</th>
                        <th className="p-3">Latency</th>
                        <th className="p-3">Timestamp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.from({ length: 10 }, (_, i) => (
                        <tr key={i} className="border-t border-gray-200/70 dark:border-gray-800/70">
                          <td className="p-3">{i % 2 === 0 ? 't-1' : 't-3'}</td>
                          <td className="p-3 font-mono">user{i + 3}@example.com</td>
                          <td className="p-3">{i % 4 === 0 ? 'failed' : 'sent'}</td>
                          <td className="p-3">{200 + i * 19}ms</td>
                          <td className="p-3 text-gray-600 dark:text-gray-300">2026-03-2{i} 10:3{i}:00</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </div>
          ) : null}
        </div>
      ) : null}

      {kind === 'reports' ? (
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => setReportTab('bookings')}
              className={`rounded-lg border px-3 py-1 text-sm ${reportTab === 'bookings' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              Bookings
            </button>
            <button
              type="button"
              onClick={() => setReportTab('allocations')}
              className={`rounded-lg border px-3 py-1 text-sm ${reportTab === 'allocations' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              Allocations
            </button>
            <button
              type="button"
              onClick={() => setReportTab('utilization')}
              className={`rounded-lg border px-3 py-1 text-sm ${reportTab === 'utilization' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              Utilization
            </button>
          </div>

          <Card className="p-4 mb-4">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <div className="text-sm font-semibold mb-2">Report Controls</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Set filters, group, then export (demo UI).</div>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => runDemo('Generate report')}
                className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity"
              >
                {busy ? 'Generating…' : 'Generate'}
              </button>
            </div>

            <div className="mt-4 grid grid-cols-1 md:grid-cols-4 gap-3">
              <label className="block">
                <span className="text-xs text-gray-600 dark:text-gray-300">Start</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                  type="date"
                  value={reportStart}
                  onChange={(e) => setReportStart(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600 dark:text-gray-300">End</span>
                <input
                  className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                  type="date"
                  value={reportEnd}
                  onChange={(e) => setReportEnd(e.target.value)}
                />
              </label>
              <label className="block">
                <span className="text-xs text-gray-600 dark:text-gray-300">Group by</span>
                <select
                  className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                  value={reportGroupBy}
                  onChange={(e) => setReportGroupBy(e.target.value as typeof reportGroupBy)}
                >
                  <option value="day">Day</option>
                  <option value="week">Week</option>
                  <option value="resource">Resource</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => runDemo('Export CSV')}
                  className="w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60"
                >
                  Export CSV
                </button>
              </div>
            </div>
          </Card>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 lg:col-span-2">
              <div className="flex items-center justify-between gap-3 mb-3">
                <div className="text-sm font-semibold">
                  {reportTab === 'bookings' ? 'Bookings Summary' : reportTab === 'allocations' ? 'Allocations Summary' : 'Utilization Summary'}
                </div>
                <div className="text-xs text-gray-600 dark:text-gray-300">
                  {reportStart} → {reportEnd}
                </div>
              </div>
              <div className="h-56 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-gradient-to-br from-purple-500/10 via-transparent to-cyan-500/10 flex items-center justify-center text-sm text-gray-600 dark:text-gray-300">
                Chart placeholder (UI only)
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-4">
                {Array.from({ length: 3 }, (_, i) => (
                  <div key={i} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 p-3">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      Metric {i + 1}
                    </div>
                    <div className="text-lg font-semibold">{(i + 2) * 23 + (reportTab === 'utilization' ? 10 : 0)}</div>
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-4">
              <div className="text-sm font-semibold mb-3">Table</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                Demo rows below. Wire up later to reporting views.
              </div>
              <div className="overflow-auto max-h-[360px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/5 dark:bg-white/5 sticky top-0">
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <th className="p-3">Group</th>
                      <th className="p-3">Value</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 12 }, (_, i) => (
                      <tr key={i} className="border-t border-gray-200/70 dark:border-gray-800/70">
                        <td className="p-3">{reportGroupBy === 'day' ? `Day ${i + 1}` : reportGroupBy === 'week' ? `Week ${i + 1}` : `Res-${i + 1}`}</td>
                        <td className="p-3 font-mono">{(i + 1) * (reportTab === 'bookings' ? 14 : reportTab === 'allocations' ? 9 : 7)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {kind === 'dashboard' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
            {Array.from({ length: 4 }, (_, i) => (
              <div key={i} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 p-3">
                <div className="text-xs text-gray-500 dark:text-gray-400">{['Today', 'Upcoming', 'Utilization', 'Alerts'][i]}</div>
                <div className="text-lg font-semibold">{(i + 3) * 7 + (normalized.includes('customer') ? 1 : 0)}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <Card className="p-4 lg:col-span-2">
              <div className="text-sm font-semibold mb-2">Recent Activity</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">UI-only activity feed (demo).</div>
              <div className="overflow-auto max-h-[360px]">
                <table className="min-w-full text-sm">
                  <thead className="bg-black/5 dark:bg-white/5">
                    <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                      <th className="p-3">Event</th>
                      <th className="p-3">Actor</th>
                      <th className="p-3">When</th>
                      <th className="p-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Array.from({ length: 10 }, (_, i) => (
                      <tr key={i} className="border-t border-gray-200/70 dark:border-gray-800/70">
                        <td className="p-3">{i % 3 === 0 ? 'Booking created' : i % 3 === 1 ? 'Allocation preview run' : 'Notification queued'}</td>
                        <td className="p-3 font-mono">{i % 2 === 0 ? 'user-1' : 'user-2'}</td>
                        <td className="p-3 text-gray-600 dark:text-gray-300">2026-03-0{i + 2} 11:1{i}:00</td>
                        <td className="p-3">{i % 4 === 0 ? 'warning' : 'ok'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
            <Card className="p-4">
              <div className="text-sm font-semibold mb-2">Quick Actions</div>
              <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">Start flows without enforcing rules yet.</div>
              <div className="space-y-2">
                <button type="button" onClick={() => runDemo('Create booking')} disabled={busy} className="w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60">
                  Create Booking
                </button>
                <button type="button" onClick={() => runDemo('Run allocation')} disabled={busy} className="w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60">
                  Run Allocation
                </button>
                <button type="button" onClick={() => runDemo('View reports')} disabled={busy} className="w-full rounded-lg bg-purple-600 text-white px-3 py-2 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity">
                  View Reports
                </button>
              </div>
            </Card>
          </div>
        </div>
      ) : null}

      {/* Settings / Extras (controls first, wiring later) */}
      {kind !== 'allocation' && kind !== 'notifications' && kind !== 'reports' && kind !== 'dashboard' ? (
        <div>
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            <button
              type="button"
              onClick={() => setOverviewTab('overview')}
              className={`rounded-lg border px-3 py-1 text-sm ${overviewTab === 'overview' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              Overview
            </button>
            <button
              type="button"
              onClick={() => setOverviewTab('manage')}
              className={`rounded-lg border px-3 py-1 text-sm ${overviewTab === 'manage' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              Configuration
            </button>
            <button
              type="button"
              onClick={() => setOverviewTab('activity')}
              className={`rounded-lg border px-3 py-1 text-sm ${overviewTab === 'activity' ? 'border-accent' : 'border-gray-200/70 dark:border-gray-800/70'}`}
            >
              Activity
            </button>
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className="xl:col-span-2 space-y-4">
              {overviewTab === 'overview' ? (
                <Card className="p-4">
                  <div className="text-sm font-semibold mb-2">At-a-glance</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">UI-only summary cards.</div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {Array.from({ length: 3 }, (_, i) => (
                      <div key={i} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 p-3">
                        <div className="text-xs text-gray-500 dark:text-gray-400">{['Total', 'Active', 'Pending'][i]}</div>
                        <div className="text-lg font-semibold">{18 + i * 7 + (kind === 'resource-management' ? 10 : 0)}</div>
                      </div>
                    ))}
                  </div>
                </Card>
              ) : null}

              {overviewTab === 'manage' ? (
                <Card className="p-4">
                  {kind === 'branding' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Branding</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">Logo</div>
                          <input type="file" className="w-full" accept="image/*" />
                          <div className="mt-3 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-black/5 dark:bg-white/5 p-3">
                            <div className="text-xs text-gray-600 dark:text-gray-300 mb-2">Preview</div>
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-gradient-to-br from-purple-500/20 to-cyan-500/20 flex items-center justify-center font-mono text-xs">
                                Logo
                              </div>
                              <div className="leading-tight">
                                <div className="text-sm font-semibold">BookFlow</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Accent preview</div>
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Theme mode</span>
                            <select
                              className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                              defaultValue="macos-light"
                            >
                              <option value="macos-light">macOS Light</option>
                              <option value="macos-dark">macOS Dark</option>
                              <option value="system">System</option>
                            </select>
                          </label>

                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Accent color</span>
                            <div className="mt-1 flex items-center gap-3">
                              <input type="color" defaultValue="#0A84FF" className="h-10 w-16 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40" />
                              <input
                                className="flex-1 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                                defaultValue="#0A84FF"
                                readOnly
                              />
                            </div>
                          </label>

                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-1">Fallback mechanism</div>
                            <div className="text-xs text-gray-600 dark:text-gray-300">
                              If a logo upload fails, the app will fall back to the default logo.
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'tenants' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Tenant Management</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="overflow-auto max-h-[340px]">
                          <table className="min-w-full text-sm">
                            <thead className="bg-black/5 dark:bg-white/5">
                              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                <th className="p-3">Slug</th>
                                <th className="p-3">Name</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {['dev', 'tenant-a', 'tenant-b'].map((slug, i) => (
                                <tr key={slug} className="border-t border-gray-200/70 dark:border-gray-800/70">
                                  <td className="p-3 font-mono">{slug}</td>
                                  <td className="p-3">{i === 0 ? 'Development Tenant' : `Company ${i}`}</td>
                                  <td className="p-3">{i === 0 ? 'active' : 'inactive'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Create tenant</span>
                            <input
                              className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                              placeholder="Tenant name"
                              value={nameDraft}
                              onChange={(e) => setNameDraft(e.target.value)}
                            />
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Status</span>
                            <select
                              className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                              value={statusDraft}
                              onChange={(e) => setStatusDraft(e.target.value as typeof statusDraft)}
                            >
                              <option value="active">Active</option>
                              <option value="inactive">Inactive</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Notes</span>
                            <textarea
                              className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                              rows={3}
                              value={notesDraft}
                              onChange={(e) => setNotesDraft(e.target.value)}
                              placeholder="Optional tenant notes…"
                            />
                          </label>
                          <button
                            type="button"
                            disabled={editorBusy}
                            onClick={saveSettingsDemo}
                            className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
                          >
                            {editorBusy ? 'Saving…' : 'Create Tenant (demo)'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'roles' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Roles & Permissions</div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1 overflow-auto max-h-[380px]">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Roles</div>
                          <div className="space-y-2">
                            {['Tenant Admin', 'Branch Admin', 'Dispatcher', 'Staff', 'Customer'].map((r) => (
                              <button
                                key={r}
                                type="button"
                                onClick={() => showToast({ kind: 'info', message: `Selected role: ${r} (demo).` })}
                                className="w-full text-left rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 px-3 py-2 text-sm hover:opacity-90"
                              >
                                {r}
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="lg:col-span-2 space-y-3">
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-2">Permission Matrix</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {[
                                'Manage tenants',
                                'Manage roles',
                                'Create bookings',
                                'View bookings',
                                'Manage resources',
                                'Run allocation',
                                'Dispatch notifications',
                                'View audit logs',
                              ].map((p) => (
                                <label key={p} className="flex items-center gap-2 text-sm">
                                  <input type="checkbox" defaultChecked={p.includes('View') || p.includes('Run')} />
                                  <span>{p}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" disabled={editorBusy} onClick={() => runDemo('Reset permissions')} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60">
                              Reset
                            </button>
                            <button type="button" disabled={editorBusy} onClick={saveSettingsDemo} className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity">
                              {editorBusy ? 'Saving…' : 'Save Permissions (demo)'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'services' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Services & Sub-services</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="overflow-auto max-h-[380px]">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Service Catalog</div>
                          <table className="min-w-full text-sm">
                            <thead className="bg-black/5 dark:bg-white/5">
                              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                <th className="p-3">Service</th>
                                <th className="p-3">Duration</th>
                                <th className="p-3">Active</th>
                              </tr>
                            </thead>
                            <tbody>
                              {['Initial Consultation', 'Follow-up Visit', 'Group Session'].map((s, i) => (
                                <tr key={s} className="border-t border-gray-200/70 dark:border-gray-800/70">
                                  <td className="p-3">{s}</td>
                                  <td className="p-3 font-mono">{[30, 20, 60][i]}m</td>
                                  <td className="p-3">{i !== 2 ? 'yes' : 'no'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Add service</div>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Service name</span>
                            <input
                              className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                              placeholder="e.g., Therapy Session"
                              value={nameDraft}
                              onChange={(e) => setNameDraft(e.target.value)}
                            />
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Duration (min)</span>
                              <input
                                className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                                placeholder="30"
                                defaultValue="30"
                                readOnly
                              />
                            </label>
                            <label className="block">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Active</span>
                              <select
                                className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2"
                                value={statusDraft}
                                onChange={(e) => setStatusDraft(e.target.value as typeof statusDraft)}
                              >
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                              </select>
                            </label>
                          </div>

                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-2">Sub-services</div>
                            <div className="space-y-2">
                              {['Option A', 'Option B', 'Option C'].map((ss) => (
                                <div key={ss} className="flex items-center justify-between gap-3 text-sm">
                                  <span className="text-gray-700 dark:text-gray-200">{ss}</span>
                                  <span className="text-xs text-gray-500 dark:text-gray-400">-</span>
                                </div>
                              ))}
                            </div>
                            <button type="button" onClick={() => runDemo('Add sub-service')} disabled={busy} className="mt-3 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60">
                              Add Sub-service (demo)
                            </button>
                          </div>

                          <button type="button" disabled={editorBusy} onClick={saveSettingsDemo} className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity">
                            {editorBusy ? 'Saving…' : 'Save Service (demo)'}
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'resource-management' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Resource Management</div>
                      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
                        <div className="xl:col-span-1 overflow-auto max-h-[420px]">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Resources</div>
                            <button type="button" disabled={busy} onClick={() => runDemo('Add resource')} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-2 py-1 text-xs hover:opacity-90 disabled:opacity-60">
                              Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {['VEH-1', 'RM-2', 'STF-3', 'RM-4', 'VEH-5'].map((code, i) => (
                              <button
                                key={code}
                                type="button"
                                onClick={() => showToast({ kind: 'info', message: `Selected ${code} (demo).` })}
                                className="w-full text-left rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 px-3 py-2 text-sm hover:opacity-90"
                              >
                                <div className="font-mono">{code}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">{['Vehicle', 'Room', 'Staff'][i % 3]}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="xl:col-span-2 space-y-3">
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-3">Editor</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                              <label className="block">
                                <span className="text-xs text-gray-600 dark:text-gray-300">Code</span>
                                <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="RM-2" readOnly />
                              </label>
                              <label className="block">
                                <span className="text-xs text-gray-600 dark:text-gray-300">Name</span>
                                <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="Meeting Room 2" readOnly />
                              </label>
                              <label className="block">
                                <span className="text-xs text-gray-600 dark:text-gray-300">Capacity</span>
                                <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="12" readOnly />
                              </label>
                              <label className="block">
                                <span className="text-xs text-gray-600 dark:text-gray-300">Status</span>
                                <select className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="active" disabled>
                                  <option value="active">Active</option>
                                  <option value="inactive">Inactive</option>
                                </select>
                              </label>
                            </div>
                          </div>

                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-2">Seat map (preview)</div>
                            <div className="grid grid-cols-6 gap-2">
                              {Array.from({ length: 18 }, (_, i) => (
                                <div key={i} className="h-10 rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 flex items-center justify-center text-xs text-gray-600 dark:text-gray-300">
                                  {i + 1}
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button type="button" disabled={editorBusy} onClick={() => runDemo('Reset resource')} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60">
                              Reset
                            </button>
                            <button type="button" disabled={editorBusy} onClick={saveSettingsDemo} className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity">
                              {editorBusy ? 'Saving…' : 'Save Resource (demo)'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'allocation-rules' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Allocation Rules</div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1 overflow-auto max-h-[420px]">
                          <div className="flex items-center justify-between gap-3 mb-2">
                            <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Rules</div>
                            <button type="button" disabled={busy} onClick={() => runDemo('Add rule')} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-2 py-1 text-xs hover:opacity-90 disabled:opacity-60">
                              Add
                            </button>
                          </div>
                          <div className="space-y-2">
                            {['Prioritize staff with lowest load', 'Respect service match', 'Avoid booking overlaps'].map((r, i) => (
                              <button key={r} type="button" onClick={() => showToast({ kind: 'info', message: `Selected rule ${i + 1} (demo).` })} className="w-full text-left rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 px-3 py-2 text-sm hover:opacity-90">
                                <div className="font-medium">{r}</div>
                                <div className="text-xs text-gray-500 dark:text-gray-400">Priority {i + 1}</div>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="lg:col-span-2 space-y-3">
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-3">Rule Editor</div>
                            <label className="block mb-3">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Rule type</span>
                              <select className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="priority">
                                <option value="priority">Priority Rule</option>
                                <option value="constraint">Constraint Rule</option>
                                <option value="strategy">Strategy Rule</option>
                              </select>
                            </label>

                            <div className="text-xs font-semibold mb-2">Constraints</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {[
                                'Max bookings per day',
                                'Avoid overlapping time windows',
                                'Require resource match to service',
                                'Prefer closest available slot',
                              ].map((c) => (
                                <label key={c} className="flex items-center gap-2 text-sm">
                                  <input type="checkbox" defaultChecked={c.includes('overlapping') || c.includes('match')} />
                                  <span>{c}</span>
                                </label>
                              ))}
                            </div>

                            <label className="block mt-3">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Priority (1 = highest)</span>
                              <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="2" readOnly />
                            </label>
                          </div>

                          <div className="flex items-center justify-end gap-2">
                            <button type="button" disabled={busy} onClick={() => runDemo('Test allocation')} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60">
                              Test allocation
                            </button>
                            <button type="button" disabled={editorBusy} onClick={saveSettingsDemo} className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity">
                              {editorBusy ? 'Saving…' : 'Save Rules (demo)'}
                            </button>
                          </div>

                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-black/5 dark:bg-white/5 p-3 text-sm text-gray-600 dark:text-gray-300">
                            <div className="text-xs font-semibold text-gray-700 dark:text-gray-200 mb-1">Test Results (demo)</div>
                            Allocation would succeed for 23/24 candidate bookings; conflict resolved by priority rule.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'webhooks' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Webhooks</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="overflow-auto max-h-[420px]">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">Endpoints</div>
                          <table className="min-w-full text-sm">
                            <thead className="bg-black/5 dark:bg-white/5">
                              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                <th className="p-3">URL</th>
                                <th className="p-3">Active</th>
                              </tr>
                            </thead>
                            <tbody>
                              {['https://example.com/webhook/a', 'https://example.com/webhook/b'].map((u, i) => (
                                <tr key={u} className="border-t border-gray-200/70 dark:border-gray-800/70">
                                  <td className="p-3 font-mono text-xs">{u}</td>
                                  <td className="p-3">{i === 0 ? 'yes' : 'no'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>

                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">New endpoint URL</span>
                            <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" placeholder="https://…" />
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Secret (HMAC)</span>
                            <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" placeholder="auto-generated" readOnly />
                          </label>
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-2">Events</div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                              {['booking_created', 'booking_confirmed', 'allocation_failed', 'notification_sent'].map((ev) => (
                                <label key={ev} className="flex items-center gap-2 text-sm">
                                  <input type="checkbox" defaultChecked={ev.includes('booking')} />
                                  <span className="font-mono">{ev}</span>
                                </label>
                              ))}
                            </div>
                          </div>
                          <div className="flex items-center justify-end gap-2">
                            <button type="button" disabled={busy} onClick={() => runDemo('Test webhook')} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60">
                              Test webhook
                            </button>
                            <button type="button" disabled={editorBusy} onClick={saveSettingsDemo} className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity">
                              {editorBusy ? 'Saving…' : 'Save Webhook (demo)'}
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'app-settings' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">App Settings</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-2">Feature toggles</div>
                            {['Enable notifications', 'Enable waitlist', 'Enable QR check-in', 'Show allocation warnings'].map((t, i) => (
                              <label key={t} className="flex items-center justify-between gap-3 text-sm">
                                <span>{t}</span>
                                <input type="checkbox" defaultChecked={i !== 2} />
                              </label>
                            ))}
                          </div>
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="text-xs font-semibold mb-2">Preferences</div>
                            <label className="block">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Timezone</span>
                              <select className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="Africa/Johannesburg">
                                <option value="Africa/Johannesburg">Africa/Johannesburg</option>
                                <option value="UTC">UTC</option>
                                <option value="Europe/London">Europe/London</option>
                              </select>
                            </label>
                          </div>
                        </div>
                        <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-black/5 dark:bg-white/5 p-3">
                          <div className="text-xs font-semibold mb-2">Danger zone</div>
                          <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                            UI only for now. Once connected to backend, these actions will be protected by RLS and audit logs.
                          </div>
                          <button type="button" disabled={busy} onClick={() => runDemo('Reset tenant configuration')} className="w-full rounded-lg border border-red-200 bg-red-50 text-red-700 px-3 py-2 text-sm hover:opacity-90 disabled:opacity-60">
                            Reset tenant configuration (demo)
                          </button>
                        </div>
                      </div>

                      <div className="flex items-center justify-end gap-2 mt-4">
                        <button type="button" disabled={editorBusy} onClick={saveSettingsDemo} className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity">
                          {editorBusy ? 'Saving…' : 'Save Settings (demo)'}
                        </button>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'audit-logs' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Audit Logs</div>
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                        <div className="lg:col-span-1 space-y-3">
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Actor</span>
                            <select className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="all" disabled>
                              <option value="all">All</option>
                              <option value="user-1">user-1</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Action</span>
                            <select className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="all" disabled>
                              <option value="all">All</option>
                              <option value="booking.create">booking.create</option>
                            </select>
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-xs text-gray-600 dark:text-gray-300">From</span>
                              <input type="date" className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" value={'2026-03-01'} readOnly />
                            </label>
                            <label className="block">
                              <span className="text-xs text-gray-600 dark:text-gray-300">To</span>
                              <input type="date" className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" value={'2026-03-31'} readOnly />
                            </label>
                          </div>
                          <button type="button" disabled={busy} onClick={() => runDemo('Filter logs')} className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity">
                            {busy ? 'Filtering…' : 'Filter (demo)'}
                          </button>
                        </div>
                        <div className="lg:col-span-2">
                          <div className="overflow-auto max-h-[420px]">
                            <table className="min-w-full text-sm">
                              <thead className="bg-black/5 dark:bg-white/5">
                                <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                  <th className="p-3">When</th>
                                  <th className="p-3">Actor</th>
                                  <th className="p-3">Action</th>
                                  <th className="p-3">Details</th>
                                </tr>
                              </thead>
                              <tbody>
                                {Array.from({ length: 14 }, (_, i) => (
                                  <tr key={i} className="border-t border-gray-200/70 dark:border-gray-800/70">
                                    <td className="p-3 text-gray-600 dark:text-gray-300">2026-03-0{i + 1} 12:{i}0</td>
                                    <td className="p-3 font-mono">{i % 2 === 0 ? 'user-1' : 'user-2'}</td>
                                    <td className="p-3">{i % 3 === 0 ? 'booking.create' : i % 3 === 1 ? 'allocation.preview' : 'notification.queue'}</td>
                                    <td className="p-3 text-gray-600 dark:text-gray-300">metadata payload omitted (demo)</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Extras */}
                  {kind === 'waitlists' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Waitlists</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="overflow-auto max-h-[420px]">
                          <table className="min-w-full text-sm">
                            <thead className="bg-black/5 dark:bg-white/5">
                              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                <th className="p-3">Customer</th>
                                <th className="p-3">Service</th>
                                <th className="p-3">Requested</th>
                                <th className="p-3">Status</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: 10 }, (_, i) => (
                                <tr key={i} className="border-t border-gray-200/70 dark:border-gray-800/70">
                                  <td className="p-3 font-mono">cust{i + 1}</td>
                                  <td className="p-3">{i % 2 === 0 ? 'Initial Consultation' : 'Follow-up Visit'}</td>
                                  <td className="p-3 text-gray-600 dark:text-gray-300">2026-03-{String(10 + i).padStart(2, '0')}</td>
                                  <td className="p-3">{i % 3 === 0 ? 'approved' : 'pending'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Add to waitlist</div>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Customer email</span>
                            <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" placeholder="name@example.com" />
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Service</span>
                            <select className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="svc-1">
                              <option value="svc-1">Initial Consultation</option>
                              <option value="svc-2">Follow-up Visit</option>
                            </select>
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Requested date</span>
                            <input type="date" className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="2026-03-20" />
                          </label>
                          <button type="button" disabled={busy} onClick={() => runDemo('Add waitlist entry')} className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity">
                            Add (demo)
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'qr-checkin' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">QR Check-in</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">QR payload</span>
                            <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2 font-mono" defaultValue="BF:BOOK-000123" />
                          </label>
                          <button type="button" disabled={busy} onClick={() => runDemo('Verify QR')} className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity">
                            {busy ? 'Verifying…' : 'Verify (demo)'}
                          </button>
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-black/5 dark:bg-white/5 p-3 text-sm text-gray-600 dark:text-gray-300">
                            Result: Booking <span className="font-mono">BOOK-000123</span> would be marked as checked-in.
                          </div>
                        </div>
                        <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                          <div className="text-xs font-semibold mb-2">Check-in rules (UI)</div>
                          <div className="space-y-2 text-sm">
                            <div className="flex items-center justify-between gap-3">
                              <span>Allow window</span>
                              <span className="font-mono">-15m / +30m</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Mark status</span>
                              <span className="font-mono">checked_in</span>
                            </div>
                            <div className="flex items-center justify-between gap-3">
                              <span>Queue notifications</span>
                              <span className="font-mono">enabled</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'promotions' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Promotions</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="overflow-auto max-h-[420px]">
                          <table className="min-w-full text-sm">
                            <thead className="bg-black/5 dark:bg-white/5">
                              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                <th className="p-3">Code</th>
                                <th className="p-3">Discount</th>
                                <th className="p-3">Active</th>
                              </tr>
                            </thead>
                            <tbody>
                              {['SAVE10', 'WELCOME20', 'SPRING15'].map((c, i) => (
                                <tr key={c} className="border-t border-gray-200/70 dark:border-gray-800/70">
                                  <td className="p-3 font-mono">{c}</td>
                                  <td className="p-3">{[10, 20, 15][i]}%</td>
                                  <td className="p-3">{i !== 2 ? 'yes' : 'no'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Create promotion</div>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Code</span>
                            <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="NEWDEAL" readOnly />
                          </label>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Discount %</span>
                            <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="25" readOnly />
                          </label>
                          <div className="grid grid-cols-2 gap-3">
                            <label className="block">
                              <span className="text-xs text-gray-600 dark:text-gray-300">Start</span>
                              <input type="date" className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="2026-03-05" readOnly />
                            </label>
                            <label className="block">
                              <span className="text-xs text-gray-600 dark:text-gray-300">End</span>
                              <input type="date" className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" defaultValue="2026-03-25" readOnly />
                            </label>
                          </div>
                          <button type="button" disabled={busy} onClick={() => runDemo('Create promotion')} className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity">
                            Create (demo)
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'feedback' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Feedback</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="overflow-auto max-h-[420px]">
                          <table className="min-w-full text-sm">
                            <thead className="bg-black/5 dark:bg-white/5">
                              <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                                <th className="p-3">From</th>
                                <th className="p-3">Message</th>
                                <th className="p-3">Rating</th>
                              </tr>
                            </thead>
                            <tbody>
                              {Array.from({ length: 8 }, (_, i) => (
                                <tr key={i} className="border-t border-gray-200/70 dark:border-gray-800/70">
                                  <td className="p-3 font-mono">cust{i + 1}</td>
                                  <td className="p-3 text-gray-600 dark:text-gray-300">Demo feedback #{i + 1}</td>
                                  <td className="p-3">{3 + (i % 3)}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Reply</div>
                          <label className="block">
                            <span className="text-xs text-gray-600 dark:text-gray-300">Message</span>
                            <textarea className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" rows={8} defaultValue="Thanks for your feedback! We'll follow up shortly." />
                          </label>
                          <button type="button" disabled={busy} onClick={() => runDemo('Send reply')} className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity">
                            Send reply (demo)
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {kind === 'api-integrations' ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">API Integrations</div>
                      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        <div className="overflow-auto max-h-[420px]">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300 mb-2">API keys</div>
                          <div className="space-y-2">
                            {['sb_publishable_xxx', 'sb_publishable_yyy', 'sb_legacy_zzz'].map((k, i) => (
                              <div key={k} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/20 p-3 flex items-start justify-between gap-3">
                                <div>
                                  <div className="text-xs text-gray-500 dark:text-gray-400">Key {i + 1}</div>
                                  <div className="font-mono text-xs mt-1 break-all">{k}</div>
                                </div>
                                <button type="button" disabled={busy} onClick={() => runDemo('Copy key')} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-1 text-sm hover:opacity-90 disabled:opacity-60">
                                  Copy
                                </button>
                              </div>
                            ))}
                          </div>
                          <button type="button" disabled={busy} onClick={() => runDemo('Create API key')} className="mt-3 w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity">
                            Create key (demo)
                          </button>
                        </div>
                        <div className="space-y-3">
                          <div className="text-xs font-semibold text-gray-600 dark:text-gray-300">Available endpoints</div>
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/15 p-3">
                            <div className="space-y-2 text-sm">
                              {[
                                'GET /bookings?from&to',
                                'POST /bookings',
                                'POST /allocation/preview',
                                'POST /notifications/dispatch',
                              ].map((e) => (
                                <div key={e} className="flex items-center justify-between gap-3">
                                  <span className="font-mono">{e}</span>
                                  <button type="button" disabled={busy} onClick={() => runDemo('Open docs')} className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-2 py-1 text-xs hover:opacity-90 disabled:opacity-60">
                                    Docs
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                          <div className="rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-black/5 dark:bg-white/5 p-3 text-sm text-gray-600 dark:text-gray-300">
                            UI-only. Endpoint permissions will be enforced via RLS and JWT claims later.
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : null}

                  {/* Generic fallback for any settings page not covered above */}
                  {!(kind === 'branding' || kind === 'tenants' || kind === 'roles' || kind === 'services' || kind === 'resource-management' || kind === 'allocation-rules' || kind === 'webhooks' || kind === 'app-settings' || kind === 'audit-logs' || kind === 'waitlists' || kind === 'qr-checkin' || kind === 'promotions' || kind === 'feedback' || kind === 'api-integrations') ? (
                    <div>
                      <div className="text-sm font-semibold mb-3">Configuration</div>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <label className="block">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Name</span>
                          <input className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" value={nameDraft} onChange={(e) => setNameDraft(e.target.value)} />
                        </label>
                        <label className="block">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Status</span>
                          <select className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" value={statusDraft} onChange={(e) => setStatusDraft(e.target.value as typeof statusDraft)}>
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                          </select>
                        </label>
                        <label className="block md:col-span-2">
                          <span className="text-xs text-gray-600 dark:text-gray-300">Notes</span>
                          <textarea className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 bg-white/40 dark:bg-[#1c1c1e]/25 px-3 py-2" rows={4} value={notesDraft} onChange={(e) => setNotesDraft(e.target.value)} />
                        </label>
                      </div>
                      <div className="flex items-center justify-end gap-2 mt-4">
                        <button type="button" disabled={editorBusy} onClick={saveSettingsDemo} className="rounded-lg bg-purple-600 text-white px-3 py-1 text-sm shadow-sm hover:opacity-95 active:opacity-90 disabled:opacity-60 transition-opacity">
                          {editorBusy ? 'Saving…' : 'Save (demo)'}
                        </button>
                      </div>
                    </div>
                  ) : null}
                </Card>
              ) : null}

              {overviewTab === 'activity' ? (
                <Card className="p-4">
                  <div className="text-sm font-semibold mb-3">Recent Activity</div>
                  <div className="text-xs text-gray-600 dark:text-gray-300 mb-3">Demo feed. Later this will come from `audit_log`.</div>
                  <div className="overflow-auto max-h-[420px]">
                    <table className="min-w-full text-sm">
                      <thead className="bg-black/5 dark:bg-white/5">
                        <tr className="text-left text-xs text-gray-500 dark:text-gray-400">
                          <th className="p-3">When</th>
                          <th className="p-3">Actor</th>
                          <th className="p-3">Action</th>
                          <th className="p-3">Result</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Array.from({ length: 14 }, (_, i) => (
                          <tr key={i} className="border-t border-gray-200/70 dark:border-gray-800/70">
                            <td className="p-3 text-gray-600 dark:text-gray-300">2026-03-0{i + 1} 12:{i}0</td>
                            <td className="p-3 font-mono">{i % 2 === 0 ? 'user-1' : 'user-2'}</td>
                            <td className="p-3">{i % 3 === 0 ? 'create' : i % 3 === 1 ? 'update' : 'dispatch'}</td>
                            <td className="p-3">{i % 5 === 0 ? 'warning' : 'ok'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ) : null}
            </div>

            <div className="xl:col-span-1 space-y-4">
              <Card className="p-4">
                <div className="text-sm font-semibold mb-2">Guidance</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                  <div>• Controls are wired to demo state only.</div>
                  <div>• Later, backend + RLS will enforce tenant isolation.</div>
                  <div>• Audit logs will record all mutations.</div>
                </div>
              </Card>
              <Card className="p-4">
                <div className="text-sm font-semibold mb-2">Keyboard shortcuts</div>
                <div className="text-xs text-gray-600 dark:text-gray-300 space-y-2">
                  <div>• `Tab` cycles through inputs.</div>
                  <div>• Use `Enter` to submit demo forms.</div>
                  <div>• `Esc` cancels modal actions (when implemented).</div>
                </div>
              </Card>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}


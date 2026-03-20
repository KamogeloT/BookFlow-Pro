import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsBtnSecondary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type Channel = { id: string; channel_type: string; name: string | null; is_active: boolean }
type Template = {
  id: string
  channel_id: string
  trigger_event: string
  code: string
  name: string
  subject_template: string | null
  body_template: string
  is_active: boolean
}

const SETTINGS_ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

export function NotificationTemplatesSettingsPage() {
  return (
    <RoleGuard allowedRoles={[...SETTINGS_ROLES]}>
      <NotifTemplatesInner />
    </RoleGuard>
  )
}

function NotifTemplatesInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [channels, setChannels] = useState<Channel[]>([])
  const [templates, setTemplates] = useState<Template[]>([])
  const [selectedId, setSelectedId] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newTpl, setNewTpl] = useState({
    code: '',
    name: '',
    trigger_event: 'booking_confirmed',
    channel_id: '',
    subject_template: '',
    body_template: 'Hello {{customer_name}}, …',
  })

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const [chRes, tRes] = await Promise.all([
        supabase.from('notification_channels').select('id,channel_type,name,is_active').eq('tenant_id', tenantId).order('channel_type'),
        supabase
          .from('notification_templates')
          .select('id,channel_id,trigger_event,code,name,subject_template,body_template,is_active')
          .eq('tenant_id', tenantId)
          .order('code'),
      ])
      if (chRes.error) throw chRes.error
      if (tRes.error) throw tRes.error
      setChannels((chRes.data ?? []) as Channel[])
      const tlist = (tRes.data ?? []) as Template[]
      setTemplates(tlist)
      setSelectedId((prev) => prev || tlist[0]?.id || '')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load templates')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  const selected = templates.find((t) => t.id === selectedId)

  async function saveTemplate(t: Template) {
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase
        .from('notification_templates')
        .update({
          channel_id: t.channel_id,
          trigger_event: t.trigger_event,
          code: t.code,
          name: t.name,
          subject_template: t.subject_template,
          body_template: t.body_template,
          is_active: t.is_active,
          updated_at: new Date().toISOString(),
        })
        .eq('id', t.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function createTemplate() {
    if (!tenantId || !newTpl.code.trim() || !newTpl.name.trim() || !newTpl.channel_id) return
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('notification_templates').insert({
        tenant_id: tenantId,
        channel_id: newTpl.channel_id,
        trigger_event: newTpl.trigger_event,
        code: newTpl.code.trim().replace(/\s+/g, '_').toUpperCase(),
        name: newTpl.name.trim(),
        subject_template: newTpl.subject_template || null,
        body_template: newTpl.body_template,
        is_active: true,
      })
      if (iErr) throw iErr
      setNewTpl({
        code: '',
        name: '',
        trigger_event: 'booking_confirmed',
        channel_id: channels[0]?.id ?? '',
        subject_template: '',
        body_template: 'Hello {{customer_name}}, …',
      })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function addEmailChannel() {
    if (!tenantId) return
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('notification_channels').insert({
        tenant_id: tenantId,
        channel_type: 'email',
        name: 'Email',
        is_active: true,
      })
      if (iErr) throw iErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add channel (unique per type per tenant).')
    } finally {
      setBusy(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="Notification Templates">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId) {
    return <SettingsShell title="Notification Templates" error={tErr ?? 'No tenant.'} />
  }

  return (
    <SettingsShell
      title="Notification Templates"
      description="Templates tied to channels and trigger events (used when enqueueing notifications)."
      error={error}
      onDismissError={() => setError(null)}
    >
      <section className="mb-6 flex flex-wrap gap-3 items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">Channels:</span>
        {channels.map((c) => (
          <span key={c.id} className="rounded-full bg-gray-100 dark:bg-gray-800 px-3 py-1 text-xs font-mono">
            {c.name || c.channel_type}
          </span>
        ))}
        <button type="button" className={settingsBtnSecondary + ' text-xs py-1'} disabled={busy} onClick={() => void addEmailChannel()}>
          + Email channel
        </button>
      </section>

      <section className="mb-8 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold">New template</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={settingsInputClass}
            placeholder="Code (unique)"
            value={newTpl.code}
            onChange={(e) => setNewTpl({ ...newTpl, code: e.target.value })}
          />
          <input
            className={settingsInputClass}
            placeholder="Display name"
            value={newTpl.name}
            onChange={(e) => setNewTpl({ ...newTpl, name: e.target.value })}
          />
          <select
            className={settingsInputClass}
            value={newTpl.channel_id}
            onChange={(e) => setNewTpl({ ...newTpl, channel_id: e.target.value })}
          >
            <option value="">Channel…</option>
            {channels.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name || c.channel_type}
              </option>
            ))}
          </select>
          <input
            className={settingsInputClass}
            placeholder="Trigger event"
            value={newTpl.trigger_event}
            onChange={(e) => setNewTpl({ ...newTpl, trigger_event: e.target.value })}
          />
        </div>
        <input
          className={settingsInputClass}
          placeholder="Subject (optional)"
          value={newTpl.subject_template}
          onChange={(e) => setNewTpl({ ...newTpl, subject_template: e.target.value })}
        />
        <textarea
          className={`min-h-[100px] font-mono text-xs ${settingsInputClass}`}
          value={newTpl.body_template}
          onChange={(e) => setNewTpl({ ...newTpl, body_template: e.target.value })}
        />
        <button type="button" className={settingsBtnPrimary} disabled={busy || !newTpl.channel_id} onClick={() => void createTemplate()}>
          Create template
        </button>
      </section>

      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <div>
          <h2 className="text-sm font-semibold mb-2">Templates</h2>
          <ul className="rounded-lg border border-gray-200/70 dark:border-gray-800 divide-y divide-gray-100 dark:divide-gray-800 max-h-[480px] overflow-auto">
            {templates.map((t) => (
              <li key={t.id}>
                <button
                  type="button"
                  className={`w-full text-left px-3 py-2 text-sm hover:bg-black/5 dark:hover:bg-white/5 ${selectedId === t.id ? 'bg-purple-50 dark:bg-purple-950/40' : ''}`}
                  onClick={() => setSelectedId(t.id)}
                >
                  <div className="font-medium">{t.name}</div>
                  <div className="text-xs font-mono text-gray-500">{t.code}</div>
                </button>
              </li>
            ))}
            {templates.length === 0 ? <li className="p-4 text-sm text-gray-500">No templates</li> : null}
          </ul>
        </div>

        <div>
          {selected ? (
            <div className="space-y-3">
              <input
                className={settingsInputClass}
                value={selected.name}
                onChange={(e) => setTemplates((prev) => prev.map((x) => (x.id === selected.id ? { ...x, name: e.target.value } : x)))}
              />
              <div className="grid sm:grid-cols-2 gap-2">
                <input
                  className={settingsInputClass + ' font-mono text-xs'}
                  value={selected.code}
                  onChange={(e) => setTemplates((prev) => prev.map((x) => (x.id === selected.id ? { ...x, code: e.target.value } : x)))}
                />
                <select
                  className={settingsInputClass}
                  value={selected.channel_id}
                  onChange={(e) => setTemplates((prev) => prev.map((x) => (x.id === selected.id ? { ...x, channel_id: e.target.value } : x)))}
                >
                  {channels.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name || c.channel_type}
                    </option>
                  ))}
                </select>
                <input
                  className={settingsInputClass}
                  value={selected.trigger_event}
                  onChange={(e) =>
                    setTemplates((prev) => prev.map((x) => (x.id === selected.id ? { ...x, trigger_event: e.target.value } : x)))
                  }
                />
                <label className="text-sm flex items-center gap-2 text-gray-700 dark:text-gray-300">
                  <input
                    type="checkbox"
                    checked={selected.is_active}
                    onChange={(e) =>
                      setTemplates((prev) => prev.map((x) => (x.id === selected.id ? { ...x, is_active: e.target.checked } : x)))
                    }
                  />
                  Active
                </label>
              </div>
              <input
                className={settingsInputClass}
                placeholder="Subject"
                value={selected.subject_template ?? ''}
                onChange={(e) =>
                  setTemplates((prev) => prev.map((x) => (x.id === selected.id ? { ...x, subject_template: e.target.value } : x)))
                }
              />
              <textarea
                className={`min-h-[200px] font-mono text-xs ${settingsInputClass}`}
                value={selected.body_template}
                onChange={(e) =>
                  setTemplates((prev) => prev.map((x) => (x.id === selected.id ? { ...x, body_template: e.target.value } : x)))
                }
              />
              <button type="button" className={settingsBtnPrimary} disabled={busy} onClick={() => void saveTemplate(selected)}>
                Save template
              </button>
            </div>
          ) : (
            <p className="text-sm text-gray-500">Select a template or create one.</p>
          )}
        </div>
      </div>
    </SettingsShell>
  )
}

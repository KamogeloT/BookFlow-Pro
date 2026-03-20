import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsBtnSecondary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type RuleRow = {
  id: string
  name: string
  rule_scope: string
  priority: number
  rule_expression: Record<string, unknown>
  is_active: boolean
}

const SETTINGS_ROLES = ['Tenant Admin', 'Branch Admin', 'Dispatcher'] as const

export function AllocationRulesSettingsPage() {
  return (
    <RoleGuard allowedRoles={[...SETTINGS_ROLES]}>
      <AllocationRulesInner />
    </RoleGuard>
  )
}

function AllocationRulesInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [rows, setRows] = useState<RuleRow[]>([])
  const [jsonText, setJsonText] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [newRule, setNewRule] = useState({ name: '', rule_scope: 'service', priority: 100, json: '{}' })

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const { data, error: qErr } = await supabase
        .from('allocation_rules')
        .select('id,name,rule_scope,priority,rule_expression,is_active')
        .eq('tenant_id', tenantId)
        .order('priority', { ascending: true })
      if (qErr) throw qErr
      const list = (data ?? []) as RuleRow[]
      setRows(list)
      const jt: Record<string, string> = {}
      for (const r of list) {
        jt[r.id] = JSON.stringify(r.rule_expression ?? {}, null, 2)
      }
      setJsonText(jt)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load rules')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  async function createRule() {
    if (!tenantId || !newRule.name.trim()) return
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(newRule.json || '{}') as Record<string, unknown>
    } catch {
      setError('Invalid JSON in new rule expression')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('allocation_rules').insert({
        tenant_id: tenantId,
        name: newRule.name.trim(),
        rule_scope: newRule.rule_scope,
        priority: Number(newRule.priority) || 100,
        rule_expression: parsed,
        is_active: true,
      })
      if (iErr) throw iErr
      setNewRule({ name: '', rule_scope: 'service', priority: 100, json: '{}' })
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  async function saveRule(r: RuleRow) {
    let parsed: Record<string, unknown> = {}
    try {
      parsed = JSON.parse(jsonText[r.id] || '{}') as Record<string, unknown>
    } catch {
      setError(`Invalid JSON for rule "${r.name}"`)
      return
    }
    setBusy(true)
    setError(null)
    try {
      const { error: uErr } = await supabase
        .from('allocation_rules')
        .update({
          name: r.name,
          rule_scope: r.rule_scope,
          priority: r.priority,
          rule_expression: parsed,
          is_active: r.is_active,
        })
        .eq('id', r.id)
      if (uErr) throw uErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed')
    } finally {
      setBusy(false)
    }
  }

  async function deleteRule(id: string) {
    if (!confirm('Delete this allocation rule?')) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('allocation_rules').delete().eq('id', id)
      if (dErr) throw dErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="Allocation Rules">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId) {
    return <SettingsShell title="Allocation Rules" error={tErr ?? 'No tenant.'} />
  }

  return (
    <SettingsShell
      title="Allocation Rules"
      description="Priority-ordered rules with a JSON expression payload (consumed by allocation jobs)."
      error={error}
      onDismissError={() => setError(null)}
    >
      <section className="mb-8 rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-3">
        <h2 className="text-sm font-semibold">New rule</h2>
        <div className="grid gap-2 sm:grid-cols-2">
          <input
            className={settingsInputClass}
            placeholder="Name"
            value={newRule.name}
            onChange={(e) => setNewRule({ ...newRule, name: e.target.value })}
          />
          <select
            className={settingsInputClass}
            value={newRule.rule_scope}
            onChange={(e) => setNewRule({ ...newRule, rule_scope: e.target.value })}
          >
            <option value="service">service</option>
            <option value="tenant">tenant</option>
            <option value="branch">branch</option>
          </select>
          <input
            type="number"
            className={settingsInputClass}
            placeholder="Priority (lower runs first)"
            value={newRule.priority}
            onChange={(e) => setNewRule({ ...newRule, priority: Number(e.target.value) })}
          />
        </div>
        <textarea
          className={`min-h-[100px] font-mono text-xs ${settingsInputClass}`}
          value={newRule.json}
          onChange={(e) => setNewRule({ ...newRule, json: e.target.value })}
        />
        <button type="button" className={settingsBtnPrimary} disabled={busy} onClick={() => void createRule()}>
          Create rule
        </button>
      </section>

      <ul className="space-y-4">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border border-gray-200/70 dark:border-gray-800 p-4 space-y-2">
            <div className="flex flex-wrap gap-2 items-center">
              <input
                className={settingsInputClass + ' flex-1 min-w-[200px]'}
                value={r.name}
                onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))}
              />
              <select
                className={settingsInputClass + ' w-40'}
                value={r.rule_scope}
                onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, rule_scope: e.target.value } : x)))}
              >
                <option value="service">service</option>
                <option value="tenant">tenant</option>
                <option value="branch">branch</option>
              </select>
              <input
                type="number"
                className={settingsInputClass + ' w-28'}
                value={r.priority}
                onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, priority: Number(e.target.value) } : x)))}
              />
              <label className="text-sm flex items-center gap-1 text-gray-700 dark:text-gray-300">
                <input
                  type="checkbox"
                  checked={r.is_active}
                  onChange={(e) => setRows((prev) => prev.map((x) => (x.id === r.id ? { ...x, is_active: e.target.checked } : x)))}
                />
                Active
              </label>
            </div>
            <textarea
              className={`min-h-[120px] font-mono text-xs w-full ${settingsInputClass}`}
              value={jsonText[r.id] ?? '{}'}
              onChange={(e) => setJsonText((prev) => ({ ...prev, [r.id]: e.target.value }))}
            />
            <div className="flex gap-2">
              <button type="button" className={settingsBtnSecondary} disabled={busy} onClick={() => void saveRule(rows.find((x) => x.id === r.id)!)}>
                Save
              </button>
              <button type="button" className="text-red-600 text-sm underline" disabled={busy} onClick={() => void deleteRule(r.id)}>
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
      {rows.length === 0 ? <p className="text-sm text-gray-500">No allocation rules yet.</p> : null}
    </SettingsShell>
  )
}

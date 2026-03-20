import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { RoleGuard } from '../components/RoleGuard'
import { SettingsShell, settingsBtnPrimary, settingsBtnSecondary, settingsInputClass } from '../components/SettingsShell'
import { useTenantProfile } from '../hooks/useTenantProfile'

type Permission = { id: string; code: string; name: string; description: string | null }
type RoleRow = { id: string; name: string; is_system: boolean }
type ProfileRow = { id: string; display_name: string | null; email: string | null }
type AssignmentRow = {
  id: string
  user_profile_id: string
  role_id: string
  roles: { name: string } | null
  user_profiles: { display_name: string | null; email: string | null } | null
}

export function RolesSettingsPage() {
  return (
    <RoleGuard allowedRoles={['Tenant Admin']}>
      <RolesInner />
    </RoleGuard>
  )
}

function RolesInner() {
  const { tenantId, loading: tLoading, error: tErr } = useTenantProfile()
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [roles, setRoles] = useState<RoleRow[]>([])
  const [permSet, setPermSet] = useState<Set<string>>(new Set()) // "roleId:permId"
  const [profiles, setProfiles] = useState<ProfileRow[]>([])
  const [assignments, setAssignments] = useState<AssignmentRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [assignUserId, setAssignUserId] = useState('')
  const [assignRoleId, setAssignRoleId] = useState('')
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    if (!tenantId) return
    setLoading(true)
    setError(null)
    try {
      const [permRes, rolesRes, profRes, asgRes] = await Promise.all([
        supabase.from('permissions').select('id,code,name,description').order('code'),
        supabase.from('roles').select('id,name,is_system').eq('tenant_id', tenantId).order('name'),
        supabase.from('user_profiles').select('id,display_name,email').eq('tenant_id', tenantId).order('email'),
        supabase
          .from('user_role_assignments')
          .select('id,user_profile_id,role_id,roles(name),user_profiles(display_name,email)')
          .eq('tenant_id', tenantId),
      ])
      if (permRes.error) throw permRes.error
      if (rolesRes.error) throw rolesRes.error
      if (profRes.error) throw profRes.error
      if (asgRes.error) throw asgRes.error

      const roleList = (rolesRes.data ?? []) as RoleRow[]
      const roleIds = roleList.map((r) => r.id)
      let rpRows: { role_id: string; permission_id: string }[] = []
      if (roleIds.length > 0) {
        const rpRes = await supabase.from('role_permissions').select('role_id,permission_id').in('role_id', roleIds)
        if (rpRes.error) throw rpRes.error
        rpRows = (rpRes.data ?? []) as { role_id: string; permission_id: string }[]
      }

      setPermissions((permRes.data ?? []) as Permission[])
      setRoles(roleList)
      const ps = new Set<string>()
      for (const r of rpRows) {
        ps.add(`${r.role_id}:${r.permission_id}`)
      }
      setPermSet(ps)
      setProfiles((profRes.data ?? []) as ProfileRow[])
      const rawAsg = (asgRes.data ?? []) as unknown as Array<{
        id: string
        user_profile_id: string
        role_id: string
        roles: { name: string } | { name: string }[] | null
        user_profiles: { display_name: string | null; email: string | null } | { display_name: string | null; email: string | null }[] | null
      }>
      setAssignments(
        rawAsg.map((a) => ({
          id: a.id,
          user_profile_id: a.user_profile_id,
          role_id: a.role_id,
          roles: Array.isArray(a.roles) ? a.roles[0] ?? null : a.roles,
          user_profiles: Array.isArray(a.user_profiles) ? a.user_profiles[0] ?? null : a.user_profiles,
        }))
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load roles data')
    } finally {
      setLoading(false)
    }
  }, [tenantId])

  useEffect(() => {
    if (tenantId) void load()
  }, [tenantId, load])

  function hasPerm(roleId: string, permissionId: string) {
    return permSet.has(`${roleId}:${permissionId}`)
  }

  async function togglePerm(roleId: string, permissionId: string, next: boolean) {
    setBusy(true)
    setError(null)
    try {
      if (next) {
        const { error: iErr } = await supabase.from('role_permissions').insert({ role_id: roleId, permission_id: permissionId })
        if (iErr) throw iErr
        setPermSet((prev) => new Set(prev).add(`${roleId}:${permissionId}`))
      } else {
        const { error: dErr } = await supabase.from('role_permissions').delete().match({ role_id: roleId, permission_id: permissionId })
        if (dErr) throw dErr
        setPermSet((prev) => {
          const n = new Set(prev)
          n.delete(`${roleId}:${permissionId}`)
          return n
        })
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Permission update failed')
      await load()
    } finally {
      setBusy(false)
    }
  }

  async function addRole() {
    if (!tenantId || !newRoleName.trim()) return
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('roles').insert({
        tenant_id: tenantId,
        name: newRoleName.trim(),
        is_system: false,
      })
      if (iErr) throw iErr
      setNewRoleName('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not create role')
    } finally {
      setBusy(false)
    }
  }

  async function deleteRole(role: RoleRow) {
    if (role.is_system) return
    if (!confirm(`Delete role "${role.name}"? Assignments will be removed.`)) return
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('roles').delete().eq('id', role.id)
      if (dErr) throw dErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  async function addAssignment() {
    if (!tenantId || !assignUserId || !assignRoleId) return
    setBusy(true)
    setError(null)
    try {
      const { error: iErr } = await supabase.from('user_role_assignments').insert({
        tenant_id: tenantId,
        user_profile_id: assignUserId,
        role_id: assignRoleId,
        is_primary: false,
      })
      if (iErr) throw iErr
      setAssignUserId('')
      setAssignRoleId('')
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assignment failed (Tenant Admin only).')
    } finally {
      setBusy(false)
    }
  }

  async function removeAssignment(id: string) {
    setBusy(true)
    setError(null)
    try {
      const { error: dErr } = await supabase.from('user_role_assignments').delete().eq('id', id)
      if (dErr) throw dErr
      await load()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Remove failed')
    } finally {
      setBusy(false)
    }
  }

  if (tLoading || loading) {
    return (
      <SettingsShell title="Roles & Permissions">
        <p className="text-sm text-gray-500">Loading…</p>
      </SettingsShell>
    )
  }
  if (tErr || !tenantId) {
    return <SettingsShell title="Roles & Permissions" error={tErr ?? 'No tenant.'} />
  }

  return (
    <SettingsShell
      title="Roles & Permissions"
      description="Map permissions to roles and assign roles to users in your tenant (Tenant Admins only)."
      error={error}
      onDismissError={() => setError(null)}
    >
      <div className="space-y-10">
        <section>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Custom role</h2>
          <div className="flex flex-wrap gap-2 items-end max-w-xl">
            <label className="flex-1 min-w-[200px] text-sm text-gray-700 dark:text-gray-300">
              Name
              <input
                className={`mt-1 ${settingsInputClass}`}
                value={newRoleName}
                onChange={(e) => setNewRoleName(e.target.value)}
                placeholder="e.g. Front desk"
              />
            </label>
            <button type="button" className={settingsBtnPrimary} disabled={busy || !newRoleName.trim()} onClick={() => void addRole()}>
              Add role
            </button>
          </div>
        </section>

        <section className="overflow-x-auto">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">Permission matrix</h2>
          <table className="min-w-[640px] w-full text-sm border-collapse">
            <thead>
              <tr className="border-b border-gray-200 dark:border-gray-700">
                <th className="text-left py-2 pr-4 font-medium text-gray-600 dark:text-gray-400">Permission</th>
                {roles.map((r) => (
                  <th key={r.id} className="text-center py-2 px-1 font-medium text-gray-600 dark:text-gray-400 whitespace-nowrap">
                    <div className="flex flex-col items-center gap-1">
                      <span>{r.name}</span>
                      {r.is_system ? (
                        <span className="text-[10px] uppercase text-gray-400">system</span>
                      ) : (
                        <button
                          type="button"
                          className="text-[11px] text-red-600 underline"
                          disabled={busy}
                          onClick={() => void deleteRole(r)}
                        >
                          delete
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {permissions.map((p) => (
                <tr key={p.id} className="border-b border-gray-100 dark:border-gray-800">
                  <td className="py-2 pr-4 align-top">
                    <div className="font-medium text-gray-800 dark:text-gray-200">{p.name}</div>
                    <div className="text-xs text-gray-500 font-mono">{p.code}</div>
                  </td>
                  {roles.map((r) => (
                    <td key={r.id} className="text-center py-2 px-1">
                      <input
                        type="checkbox"
                        className="h-4 w-4 rounded border-gray-300"
                        checked={hasPerm(r.id, p.id)}
                        disabled={busy}
                        onChange={(e) => void togglePerm(r.id, p.id, e.target.checked)}
                        aria-label={`${p.code} for ${r.name}`}
                      />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-gray-100 mb-3">User assignments</h2>
          <div className="flex flex-wrap gap-2 items-end max-w-3xl mb-4">
            <label className="text-sm text-gray-700 dark:text-gray-300 min-w-[180px] flex-1">
              User
              <select
                className={`mt-1 ${settingsInputClass}`}
                value={assignUserId}
                onChange={(e) => setAssignUserId(e.target.value)}
              >
                <option value="">Select…</option>
                {profiles.map((u) => (
                  <option key={u.id} value={u.id}>
                    {(u.display_name || u.email || u.id).slice(0, 48)}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-sm text-gray-700 dark:text-gray-300 min-w-[160px] flex-1">
              Role
              <select
                className={`mt-1 ${settingsInputClass}`}
                value={assignRoleId}
                onChange={(e) => setAssignRoleId(e.target.value)}
              >
                <option value="">Select…</option>
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className={settingsBtnSecondary}
              disabled={busy || !assignUserId || !assignRoleId}
              onClick={() => void addAssignment()}
            >
              Assign
            </button>
          </div>
          <ul className="divide-y divide-gray-100 dark:divide-gray-800 rounded-lg border border-gray-200/70 dark:border-gray-700 max-w-3xl">
            {assignments.length === 0 ? (
              <li className="p-4 text-sm text-gray-500">No assignments yet.</li>
            ) : (
              assignments.map((a) => (
                <li key={a.id} className="p-3 flex items-center justify-between gap-3 text-sm">
                  <div>
                    <span className="font-medium text-gray-800 dark:text-gray-200">
                      {a.user_profiles?.display_name || a.user_profiles?.email || a.user_profile_id}
                    </span>
                    <span className="text-gray-500"> → </span>
                    <span className="text-purple-700 dark:text-purple-300">{a.roles?.name ?? a.role_id}</span>
                  </div>
                  <button type="button" className="text-red-600 text-xs underline" disabled={busy} onClick={() => void removeAssignment(a.id)}>
                    Remove
                  </button>
                </li>
              ))
            )}
          </ul>
        </section>
      </div>
    </SettingsShell>
  )
}

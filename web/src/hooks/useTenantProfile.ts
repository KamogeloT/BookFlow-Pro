import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useTenantProfile() {
  const [tenantId, setTenantId] = useState<string | null>(null)
  const [profileId, setProfileId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function load() {
      setLoading(true)
      setError(null)
      try {
        const { data, error: qErr } = await supabase.from('user_profiles').select('id, tenant_id').maybeSingle()
        if (cancelled) return
        if (qErr) throw qErr
        setProfileId(data?.id ?? null)
        setTenantId(data?.tenant_id ?? null)
      } catch (e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Failed to load profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { tenantId, profileId, loading, error }
}

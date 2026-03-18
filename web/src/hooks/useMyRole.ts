import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'

export function useMyRole() {
  const [role, setRole] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    async function load() {
      setLoading(true)
      setError(null)
      try {
        // SQL helper: public.current_app_role()
        const { data, error } = await supabase.rpc('current_app_role')
        if (cancelled) return
        if (error) throw error

        const resolved =
          typeof data === 'string' ? data : (data as { current_app_role?: string })?.current_app_role
        setRole(resolved ?? null)
      } catch (e) {
        if (cancelled) return
        setError(e instanceof Error ? e.message : 'Failed to load role')
        setRole(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    load()
    return () => {
      cancelled = true
    }
  }, [])

  return { role, loading, error }
}


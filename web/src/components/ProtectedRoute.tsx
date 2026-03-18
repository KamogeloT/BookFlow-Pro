import { useEffect, useState } from 'react'
import { Navigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const [loading, setLoading] = useState(true)
  const [authed, setAuthed] = useState(false)

  useEffect(() => {
    async function init() {
      // Supabase password reset / email flows can land on:
      //   /#access_token=...&refresh_token=...
      // Ensure we consume that fragment so the session becomes available.
      const hash = window.location.hash.startsWith('#')
        ? window.location.hash.slice(1)
        : window.location.hash

      const params = new URLSearchParams(hash)
      const accessToken = params.get('access_token')
      const refreshToken = params.get('refresh_token')

      if (accessToken && refreshToken) {
        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })
        if (error) throw error

        // Set auth state directly from the setSession response.
        // This avoids a race where getSession() can still return null.
        setAuthed(!!data.session)

        // Remove sensitive tokens from the URL fragment after we set the session.
        window.history.replaceState({}, document.title, window.location.pathname)
      }

      if (!accessToken || !refreshToken) {
        const { data } = await supabase.auth.getSession()
        setAuthed(!!data.session)
      }
      setLoading(false)
    }

    init().catch(() => {
      // If token parsing fails, fall back to normal session check.
      supabase.auth.getSession().then(({ data }) => {
        setAuthed(!!data.session)
        setLoading(false)
      })
    })
  }, [])

  if (loading) return <div className="p-6 text-sm text-gray-500">Loading…</div>
  if (!authed) return <Navigate to="/login" replace />
  return children
}


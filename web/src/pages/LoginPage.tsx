import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabaseClient'
import { BrandLogo } from '../components/BrandLogo'

export function LoginPage() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      })
      if (error) throw error
      // Move away from /login immediately so the protected routes render.
      navigate('/book', { replace: true })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen p-6 flex items-center justify-center">
      <div className="w-full max-w-md rounded-2xl border border-gray-200/70 dark:border-gray-800/70 bg-white/80 dark:bg-[#1c1c1e]/60 backdrop-blur shadow-sm p-6">
        <div className="flex items-center justify-center mb-6">
          <BrandLogo alt="Logo" className="max-w-full h-auto max-h-28 object-contain" />
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-400 mb-4">Sign in</div>

        <form onSubmit={onSubmit} className="space-y-4">
          <label className="block">
            <span className="text-sm text-gray-700 dark:text-gray-300">Email</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 bg-white/50 dark:bg-[#1c1c1e]/30"
              value={email}
              type="email"
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </label>

          <label className="block">
            <span className="text-sm text-gray-700 dark:text-gray-300">Password</span>
            <input
              className="mt-1 w-full rounded-lg border border-gray-200/70 dark:border-gray-800/70 px-3 py-2 bg-white/50 dark:bg-[#1c1c1e]/30"
              value={password}
              type="password"
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </label>

          {error ? (
            <div className="text-sm rounded-lg border border-red-200 bg-red-50 text-red-700 p-3 shadow-sm">
              {error}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-purple-600 text-white py-2 px-3 disabled:opacity-60 shadow-sm hover:opacity-95 active:opacity-90 transition-opacity"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <div className="mt-4 text-xs text-gray-500 dark:text-gray-400">
          No account? In local dev, sign in with the seeded user.
          <div className="mt-2">
            <Link to="/" className="underline">
              Back to app shell
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}


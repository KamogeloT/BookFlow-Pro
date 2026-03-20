/**
 * Build a readable message from Supabase PostgREST errors, Auth errors, or unknown values.
 * PostgREST often fills `details` / `hint` when `message` is short or generic.
 */
export function formatSupabaseError(err: unknown, fallback: string): string {
  if (err == null) return fallback

  if (typeof err === 'string') {
    const t = err.trim()
    return t || fallback
  }

  if (typeof err === 'number' || typeof err === 'boolean') {
    return String(err)
  }

  if (err instanceof Error) {
    const ex = err as Error & {
      code?: string
      details?: string
      hint?: string
      status?: number
    }
    const parts: string[] = []
    const msg = (ex.message ?? '').trim()
    if (msg) parts.push(msg)

    const details = (ex.details ?? '').trim()
    if (details && details !== msg && !msg.includes(details)) {
      parts.push(details)
    }

    const hint = (ex.hint ?? '').trim()
    if (hint) parts.push(`Hint: ${hint}`)

    const code = (ex.code ?? '').trim()
    if (code && (code.startsWith('PGRST') || /^\d{5}$/.test(code))) {
      parts.push(`[${code}]`)
    }

    if (parts.length > 0) {
      return parts.join(' — ')
    }

    if (typeof ex.status === 'number' && ex.status >= 400) {
      return `${fallback} (HTTP ${ex.status})`
    }

    return fallback
  }

  if (typeof err === 'object') {
    const o = err as Record<string, unknown>
    const msg = typeof o.message === 'string' ? o.message.trim() : ''
    const details = typeof o.details === 'string' ? o.details.trim() : ''
    const hint = typeof o.hint === 'string' ? o.hint.trim() : ''
    const code = typeof o.code === 'string' ? o.code.trim() : ''
    const chunks = [
      msg,
      details && details !== msg ? details : '',
      hint ? `Hint: ${hint}` : '',
      code ? `[${code}]` : '',
    ].filter(Boolean)
    if (chunks.length > 0) return chunks.join(' — ')
  }

  try {
    const s = JSON.stringify(err)
    if (s && s !== '{}') return `${fallback}: ${s}`
  } catch {
    /* ignore */
  }

  return fallback
}

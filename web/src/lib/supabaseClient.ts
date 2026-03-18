import { createClient } from '@supabase/supabase-js'

// Fallbacks to make local running seamless even if `.env` isn't created.
// Project: BookFlow Pro (`zqifzthbfmfsgfjxdxvr`)
const fallbackSupabaseUrl = 'https://zqifzthbfmfsgfjxdxvr.supabase.co'
const fallbackSupabaseAnonKey = 'sb_publishable_p0-FGdPFYqhETPFHEwiWkA_Wge5A-VU'

const supabaseUrl = (import.meta.env.VITE_SUPABASE_URL as string | undefined) ?? fallbackSupabaseUrl
const supabaseAnonKey =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) ?? fallbackSupabaseAnonKey

if (!supabaseUrl || !supabaseAnonKey) {
  // Only triggers if both fallback + env vars are missing (shouldn't happen).
  console.warn('Missing Supabase configuration (URL/anon key).')
}

export const supabase = createClient(supabaseUrl ?? '', supabaseAnonKey ?? '')


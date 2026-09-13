import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL?.trim()
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim()

function isValidUrl(value) {
  try {
    return Boolean(new URL(value))
  } catch {
    return false
  }
}

function getSupabaseConfigError() {
  const missingKeys = []

  if (!supabaseUrl) missingKeys.push('VITE_SUPABASE_URL')
  if (!supabaseAnonKey) missingKeys.push('VITE_SUPABASE_ANON_KEY')

  if (missingKeys.length) {
    return `Missing ${missingKeys.join(' and ')} in this build. Add them in the deployment host and redeploy.`
  }

  if (!isValidUrl(supabaseUrl)) {
    return 'VITE_SUPABASE_URL is not a valid URL. Check the deployment environment variable and redeploy.'
  }

  return ''
}

export const supabaseConfigError = getSupabaseConfigError()
export const isSupabaseConfigured = !supabaseConfigError

export const supabase = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null

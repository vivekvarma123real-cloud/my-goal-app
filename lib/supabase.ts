import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storageKey: 'lifestack-auth',
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
    lock: (name, acquireTimeout, fn) => fn(), // disable lock to prevent AbortError
  }
})
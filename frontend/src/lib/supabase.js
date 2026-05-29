import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Supabase env vars not set. Check VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.')
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    // Bypass the navigator.locks Web Lock API. With multiple tabs/windows open,
    // the default lock can deadlock and make getSession() hang forever — which
    // froze the AINS connect flow at "Signing in to AINS...". Run fn() without
    // a lock; worst case two tabs refresh the token at once, which is harmless.
    lock: async (_name, _acquireTimeout, fn) => fn(),
  },
})

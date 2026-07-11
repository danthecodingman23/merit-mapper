import { createClient } from "@supabase/supabase-js";

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined;
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined;

if (!url || !key) {
  throw new Error(
    "Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY environment variables.",
  );
}

// Single shared client — created once at module load, never recreated.
// No Proxy wrapper: supabase-js internal methods (especially the auth fetch
// interceptor that injects the JWT) rely on `this` being the real SupabaseClient.
// A Proxy changes the `this` receiver and can silently break session injection.
export const supabase = createClient(url, key, {
  auth: {
    persistSession: true,      // save session to localStorage
    autoRefreshToken: true,    // refresh JWT automatically before expiry
    detectSessionInUrl: true,  // pick up sessions from email confirmation links
  },
});

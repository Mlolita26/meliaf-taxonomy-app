import { createBrowserClient } from '@supabase/ssr';

// Untyped client — query results are cast explicitly at call sites.
// Replace with a typed client once you run: npx supabase gen types typescript
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}

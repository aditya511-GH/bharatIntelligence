/**
 * lib/supabase-admin.ts — Server-side Supabase client (uses service role for full access)
 * Used only in API routes / server components.
 */
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
// For server/admin operations: use service role key if available, else fall back to anon key
const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabaseAdmin = createClient(supabaseUrl, supabaseKey, {
    auth: { persistSession: false },
});

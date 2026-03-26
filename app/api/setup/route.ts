/**
 * GET /api/setup — Bootstraps Supabase tables and disables RLS.
 * Visit http://localhost:3000/api/setup once to diagnose/fix Supabase connection.
 */
import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase-admin";

// SQL to paste in Supabase SQL Editor if auto-setup fails
export const MANUAL_SQL = `
-- 1. Create complaints table
create table if not exists complaints (
  id text primary key,
  title text,
  department text,
  gravity text,
  priority text,
  problem_type text,
  status text default 'Filed',
  location text,
  lat float8,
  lng float8,
  user_name text,
  user_email text,
  description text,
  original_language text,
  original_text text,
  created_at timestamptz default now()
);

-- 2. Disable Row Level Security so anon key can read/write
alter table complaints disable row level security;
`;

export async function GET() {
    // Test if table is accessible
    const { data, error: testError } = await supabaseAdmin
        .from("complaints")
        .select("id")
        .limit(1);

    if (testError) {
        return NextResponse.json({
            ok: false,
            error: testError.message,
            action: "Run the SQL below in your Supabase SQL Editor at https://supabase.com/dashboard/project/kywkchnddoppbuafkfdi/sql",
            sql: MANUAL_SQL,
        });
    }

    // Query a count
    const { count } = await supabaseAdmin
        .from("complaints")
        .select("*", { count: "exact", head: true });

    return NextResponse.json({
        ok: true,
        tableAccessible: true,
        complaintsCount: count ?? data?.length ?? 0,
        message: "Supabase is connected and complaints table is accessible.",
    });
}

/* ============================================================
   MedLink — Supabase client
   One shared client for the whole app (auth, Postgres, RPCs).
   The URL + anon key are public by design: every table is locked
   down with row level security in supabase/migrations, and all
   privileged operations go through SECURITY DEFINER RPCs that
   re-check the caller's role server-side.

   When the environment variables are missing the client is null and
   the app falls back to a localStorage demo backend so the UI stays
   fully explorable without a Supabase project.
   ============================================================ */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";

const rawUrl = import.meta.env.VITE_SUPABASE_URL;
// Supabase projects now issue a "publishable" key (sb_publishable_…); older
// ones expose the legacy anon JWT. Either name in `.env` is accepted.
const rawKey = import.meta.env.VITE_SUPABASE_ANON_KEY ?? import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

const SUPABASE_URL = typeof rawUrl === "string" ? rawUrl.trim() : "";
const SUPABASE_ANON_KEY = typeof rawKey === "string" ? rawKey.trim() : "";

/** True when `.env` provides VITE_SUPABASE_URL plus VITE_SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY. */
export const isSupabaseConfigured = SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0;

export type MedLinkSupabaseClient = SupabaseClient<Database>;

export const supabase: MedLinkSupabaseClient | null = isSupabaseConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storageKey: "medlink.supabase.auth",
      },
    })
  : null;

/**
 * The configured client, or a loud error. Use in code paths that are only
 * reachable when `isSupabaseConfigured` is true.
 */
export function requireSupabase(): MedLinkSupabaseClient {
  if (!supabase) {
    throw new Error(
      "Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or VITE_SUPABASE_PUBLISHABLE_KEY) to .env.",
    );
  }
  return supabase;
}

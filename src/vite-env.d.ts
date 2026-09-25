/// <reference types="vite/client" />

/**
 * MedLink environment variables (read from `.env`).
 * When these are absent the app runs in local demo mode.
 */
interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL?: string;
  /** Legacy Supabase anon key name. */
  readonly VITE_SUPABASE_ANON_KEY?: string;
  /** Current Supabase publishable key name (sb_publishable_…). */
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

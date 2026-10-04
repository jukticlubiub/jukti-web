/**
 * Supabase connection details. Until both are set, the site runs on the sample events
 * in lib/data/events.ts and RSVP works only as a local preview in development.
 * The publishable key is safe in the browser: row-level security guards the data.
 */
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseEnv = url && key ? { url, key } : null;

import { createServerFn } from "@tanstack/react-start";

/**
 * Exposes the (public) Supabase URL + publishable key to the browser at runtime,
 * so the app can point at an external Supabase project configured only through
 * secrets (MY_SUPABASE_URL / MY_SUPABASE_PUBLISHABLE_KEY).
 */
export const getSupabaseConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const url = process.env["MY_SUPABASE_URL"] || process.env["SUPABASE_URL"] || null;
    const publishableKey =
      process.env["MY_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["SUPABASE_PUBLISHABLE_KEY"] ||
      null;

    if (!url || !publishableKey) return null;

    return { url, publishableKey };
  }
);

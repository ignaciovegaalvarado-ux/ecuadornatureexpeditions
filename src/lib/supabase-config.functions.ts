import { createServerFn } from "@tanstack/react-start";

export const getSupabaseConfig = createServerFn({ method: "GET" }).handler(
  async () => {
    const url =
      process.env["MY_SUPABASE_URL"] || process.env["SUPABASE_URL"];
    const publishableKey =
      process.env["MY_SUPABASE_PUBLISHABLE_KEY"] ||
      process.env["SUPABASE_PUBLISHABLE_KEY"];

    if (!url || !publishableKey) {
      const missing = [
        ...(!url ? ["MY_SUPABASE_URL"] : []),
        ...(!publishableKey ? ["MY_SUPABASE_PUBLISHABLE_KEY"] : []),
      ];
      throw new Error(
        `Missing Supabase environment variable(s): ${missing.join(", ")}. Add them via Lovable Cloud secrets.`
      );
    }

    return { url, publishableKey };
  }
);

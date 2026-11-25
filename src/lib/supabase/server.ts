import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { supabasePublishableKey, supabaseSecretKey, supabaseUrl } from "./env";

/** A client that acts as the signed-in user. Used only for sign-in and sign-out. */
export async function authClient() {
  const cookieStore = await cookies();
  return createServerClient(supabaseUrl(), supabasePublishableKey(), {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          // Server components can't set cookies; the proxy refreshes the session instead.
        }
      },
    },
  });
}

/**
 * A client with full database access. Game rules are enforced in the server code
 * that calls it, and the tables have no public policies, so it must never reach
 * the browser. The "sandbox" schema holds admin test rounds (see lib/test-mode.ts).
 */
export function dataClient(schema: "public" | "sandbox" = "public") {
  return createClient(supabaseUrl(), supabaseSecretKey(), {
    auth: { persistSession: false, autoRefreshToken: false },
    db: { schema },
  });
}

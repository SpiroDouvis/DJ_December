function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing environment variable ${name}. See .env.example.`);
  return value;
}

/**
 * The project's base address. Supabase shows it in some places with /rest/v1 on
 * the end; the client adds its own paths, so anything after the host is dropped.
 */
export function normalizeSupabaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "").replace(/\/(rest|auth)\/v1$/, "");
}

export const supabaseUrl = () =>
  normalizeSupabaseUrl(required("NEXT_PUBLIC_SUPABASE_URL", process.env.NEXT_PUBLIC_SUPABASE_URL));

export const supabasePublishableKey = () =>
  required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY);

export const supabaseSecretKey = () =>
  required("SUPABASE_SECRET_KEY", process.env.SUPABASE_SECRET_KEY);

/** Emails that become admins on first sign-in, comma separated. */
export const adminEmails = (): string[] =>
  (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

import { describe, expect, it } from "vitest";
import { normalizeSupabaseUrl } from "@/lib/supabase/env";

describe("normalizeSupabaseUrl", () => {
  it("keeps a plain project address", () => {
    expect(normalizeSupabaseUrl("https://abc.supabase.co")).toBe("https://abc.supabase.co");
  });
  it("drops /rest/v1, /auth/v1 and trailing slashes", () => {
    expect(normalizeSupabaseUrl("https://abc.supabase.co/rest/v1/")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl(" https://abc.supabase.co/auth/v1 ")).toBe("https://abc.supabase.co");
    expect(normalizeSupabaseUrl("https://abc.supabase.co//")).toBe("https://abc.supabase.co");
  });
});

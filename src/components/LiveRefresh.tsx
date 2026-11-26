"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

/**
 * Keeps the page current for everyone: when anyone changes the game the server
 * broadcasts on a Supabase Realtime channel, and every open page re-fetches. The
 * page also refreshes when it comes back into view, in case a message was missed.
 */
export function LiveRefresh({ url, publishableKey, channel }: { url: string; publishableKey: string; channel: string }) {
  const router = useRouter();

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const refresh = () => {
      clearTimeout(timer);
      timer = setTimeout(() => router.refresh(), 250);
    };

    const supabase = createClient(url, publishableKey, {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    });
    const sub = supabase.channel(channel).on("broadcast", { event: "changed" }, refresh).subscribe();

    const onVisible = () => {
      if (document.visibilityState === "visible") refresh();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      clearTimeout(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(sub);
    };
  }, [url, publishableKey, channel, router]);

  return null;
}

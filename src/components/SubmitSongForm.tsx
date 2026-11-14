"use client";

import { useActionState } from "react";
import { submitSong, type FormState } from "@/app/actions";

export function SubmitSongForm({ date, round = 1, cta }: { date: string; round?: number; cta: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitSong, undefined);
  return (
    <form action={action} className="submit">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="round" value={round} />
      <input
        name="link"
        type="url"
        required
        placeholder="Paste a Spotify or Apple Music song link"
        aria-label="Song link"
      />
      <button type="submit" disabled={pending}>
        {pending ? "Finding song…" : cta}
      </button>
      {state?.error ? <p className="error">{state.error}</p> : null}
      {state?.ok ? <p className="ok">{state.ok}</p> : null}
    </form>
  );
}

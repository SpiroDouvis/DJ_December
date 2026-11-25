"use client";

import { useActionState } from "react";
import { Link2, Loader2, Send } from "lucide-react";
import { submitSong, type FormState } from "@/app/actions";
import { FormMessage } from "./FormMessage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function SubmitSongForm({ date, round = 1, cta }: { date: string; round?: number; cta: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(submitSong, undefined);
  return (
    <form action={action} className="flex flex-wrap gap-2">
      <input type="hidden" name="date" value={date} />
      <input type="hidden" name="round" value={round} />
      <div className="relative flex-[1_1_260px]">
        <Link2 className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          name="link"
          type="url"
          required
          placeholder="Paste a Spotify or Apple Music song link"
          aria-label="Song link"
          className="h-10 pl-9"
        />
      </div>
      <Button type="submit" disabled={pending} className="h-10">
        {pending ? <Loader2 className="animate-spin" /> : <Send />}
        {pending ? "Finding song…" : cta}
      </Button>
      <FormMessage state={state} />
    </form>
  );
}

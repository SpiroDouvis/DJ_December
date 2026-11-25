"use client";

import { useActionState } from "react";
import { FlaskConical, Music, Star, Wand2 } from "lucide-react";
import type { FormState } from "@/app/actions";
import { simulate, startTestRound } from "@/app/test-actions";
import { FormMessage } from "./FormMessage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { NativeSelect } from "./ui/native-select";

export function StartTestRoundForm({
  defaultStart,
  maxPlayers,
  maxDays,
  hasRound,
}: {
  defaultStart: string;
  maxPlayers: number;
  maxDays: number;
  hasRound: boolean;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(startTestRound, undefined);
  return (
    <form action={action} className="grid max-w-xl gap-4 sm:grid-cols-3">
      <Label>
        Other players
        <NativeSelect name="players" defaultValue="3">
          {Array.from({ length: maxPlayers - 1 }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n}
            </option>
          ))}
        </NativeSelect>
      </Label>
      <Label>
        Days
        <Input name="days" type="number" min={1} max={maxDays} defaultValue={6} required />
      </Label>
      <Label>
        First day
        <Input name="start" type="date" defaultValue={defaultStart} required />
      </Label>
      <label className="flex items-center gap-2 text-sm sm:col-span-3">
        <input type="checkbox" name="copyIdeas" defaultChecked className="size-4 accent-[var(--primary)]" />
        Copy the real theme ideas into the test (copies only, so real ideas never get marked as used)
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-3">
        <Button type="submit" disabled={pending}>
          <FlaskConical />
          {hasRound ? "Start a new test round" : "Start a test round"}
        </Button>
        {hasRound ? (
          <span className="text-sm text-muted-foreground">This wipes the current test round first.</span>
        ) : null}
      </div>
      <FormMessage state={state} />
    </form>
  );
}

export function SimulateForm({ players }: { players: { id: string; name: string }[] }) {
  const [state, action, pending] = useActionState<FormState, FormData>(simulate, undefined);
  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="flex flex-wrap gap-4">
        <Label>
          Fill in for
          <NativeSelect name="who" defaultValue="others">
            <option value="others">Everyone but you</option>
            <option value="everyone">Everyone, you too</option>
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                Only {p.name}
              </option>
            ))}
          </NativeSelect>
        </Label>
        <Label>
          Ratings
          <NativeSelect name="scores" defaultValue="random">
            <option value="random">Random (3 to 10)</option>
            <option value="same">Everyone gives 7 (forces ties)</option>
          </NativeSelect>
        </Label>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button type="submit" name="what" value="both" disabled={pending}>
          <Wand2 />
          Songs and ratings
        </Button>
        <Button type="submit" name="what" value="songs" variant="secondary" disabled={pending}>
          <Music />
          Only songs
        </Button>
        <Button type="submit" name="what" value="ratings" variant="secondary" disabled={pending}>
          <Star />
          Only ratings
        </Button>
      </div>
      <FormMessage state={state} />
    </form>
  );
}

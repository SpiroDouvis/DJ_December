"use client";

import { useActionState, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { setDayTheme, type FormState } from "@/app/actions";
import { FormMessage } from "./FormMessage";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { NativeSelect } from "./ui/native-select";

export type PickerIdea = { id: string; text: string; used: boolean };

/** The admin's theme dropdown for one day: the tap-friendly way to assign themes. */
export function ThemePicker({
  date,
  current,
  ideas,
  queuedCount,
}: {
  date: string;
  /** "idea:<id>", "custom" or "none". */
  current: string;
  ideas: PickerIdea[];
  /** Songs queued for this day, which a new theme removes. 0 once the day has opened. */
  queuedCount: number;
}) {
  const [state, action, pending] = useActionState<FormState, FormData>(setDayTheme, undefined);
  const [pick, setPick] = useState(current);
  const unused = ideas.filter((i) => !i.used);
  const used = ideas.filter((i) => i.used);

  return (
    <form
      action={action}
      onSubmit={(e) => {
        const changing = pick !== current && pick !== "none";
        if (
          changing &&
          queuedCount > 0 &&
          !window.confirm(
            `${queuedCount} ${queuedCount === 1 ? "player has" : "players have"} a song queued for this day. ` +
              `A new theme removes ${queuedCount === 1 ? "it" : "them"}. Go ahead?`,
          )
        ) {
          e.preventDefault();
        }
      }}
      className="flex flex-col gap-2 rounded-lg border border-primary/30 bg-primary/5 p-3"
    >
      <input type="hidden" name="date" value={date} />
      <label htmlFor={`pick-${date}`} className="text-xs font-semibold tracking-wider text-violet-300 uppercase">
        Admin · set this day&apos;s theme
      </label>
      <div className="flex flex-wrap gap-2">
        <NativeSelect
          id={`pick-${date}`}
          name="pick"
          value={pick}
          onChange={(e) => setPick(e.target.value)}
          wrapperClassName="min-w-0 flex-[1_1_220px]"
        >
          <option value="none">No theme</option>
          <option value="random">Random idea (prefers unused)</option>
          {unused.length > 0 ? (
            <optgroup label="Not used yet">
              {unused.map((i) => (
                <option key={i.id} value={`idea:${i.id}`}>
                  {i.text}
                </option>
              ))}
            </optgroup>
          ) : null}
          {used.length > 0 ? (
            <optgroup label="Already on the calendar">
              {used.map((i) => (
                <option key={i.id} value={`idea:${i.id}`}>
                  {i.text}
                </option>
              ))}
            </optgroup>
          ) : null}
          <option value="custom">Custom theme…</option>
        </NativeSelect>
        {pick === "custom" ? (
          <Input name="text" required maxLength={80} placeholder="Type a theme" className="h-9 flex-[1_1_200px]" />
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          Save
        </Button>
      </div>
      {queuedCount > 0 ? (
        <p className="text-xs text-muted-foreground">
          {queuedCount} {queuedCount === 1 ? "song is" : "songs are"} queued here. Changing the theme removes them.
        </p>
      ) : null}
      <FormMessage state={state} />
    </form>
  );
}

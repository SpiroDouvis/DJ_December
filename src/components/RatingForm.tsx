import { Check, Star } from "lucide-react";
import { rateSong } from "@/app/actions";
import { SCORE_OPTIONS } from "@/lib/game";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { NativeSelect } from "./ui/native-select";

export function RatingForm({ submissionId, current }: { submissionId: string; current?: number }) {
  return (
    <form action={rateSong} className="mt-3 flex flex-wrap items-center gap-2 border-t pt-3">
      <input type="hidden" name="submissionId" value={submissionId} />
      <Star className="size-4 text-violet-300" aria-hidden />
      <NativeSelect name="score" defaultValue={current ?? ""} required aria-label="Your rating" wrapperClassName="w-24">
        <option value="" disabled>
          Rate
        </option>
        {SCORE_OPTIONS.map((s) => (
          <option key={s} value={s}>
            {s.toFixed(1)}
          </option>
        ))}
      </NativeSelect>
      <Button type="submit" size="sm" variant={current === undefined ? "default" : "secondary"}>
        {current === undefined ? "Rate" : "Update"}
      </Button>
      {current !== undefined ? (
        <Badge variant="success" className="ml-auto">
          <Check />
          {current.toFixed(1)}
        </Badge>
      ) : null}
    </form>
  );
}

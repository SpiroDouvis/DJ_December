import { rateSong } from "@/app/actions";
import { SCORE_OPTIONS } from "@/lib/game";

export function RatingForm({ submissionId, current }: { submissionId: string; current?: number }) {
  return (
    <form action={rateSong} className="rate">
      <input type="hidden" name="submissionId" value={submissionId} />
      <label>
        Your rating{" "}
        <select name="score" defaultValue={current ?? ""} required>
          <option value="" disabled>
            Pick
          </option>
          {SCORE_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s.toFixed(1)}
            </option>
          ))}
        </select>
      </label>
      <button type="submit">{current === undefined ? "Rate" : "Update"}</button>
      {current !== undefined ? <span className="muted">Saved: {current.toFixed(1)}</span> : null}
    </form>
  );
}

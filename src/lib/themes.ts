import { randomInt } from "node:crypto";
import type { GameDate } from "./time";

/** An idea in the theme pool. submittedBy is null once its player has been removed. */
export type ThemeRow = { id: string; text: string; submittedBy: string | null; createdAt: string };
/**
 * A day's theme, which an admin assigns on the calendar. Days without a row have
 * no theme. A null text also means no theme (older rows can say so explicitly).
 */
export type DayThemeRow = { date: GameDate; text: string | null; themeId: string | null };

/**
 * Picks an idea at random, preferring ones no day has used yet. Once every idea
 * has been used, any of them can come up again.
 */
export function drawTheme<T extends Pick<ThemeRow, "id" | "text">>(
  pool: T[],
  saved: Iterable<DayThemeRow>,
  random: (max: number) => number = randomInt,
): T | null {
  if (pool.length === 0) return null;
  const used = new Set<string>();
  for (const row of saved) if (row.themeId) used.add(row.themeId);
  const fresh = pool.filter((t) => !used.has(t.id));
  const from = fresh.length > 0 ? fresh : pool;
  return from[random(from.length)];
}

/** The days each pool idea is assigned to, earliest first. */
export function daysByIdea(saved: Map<GameDate, DayThemeRow>): Map<string, GameDate[]> {
  const byIdea = new Map<string, GameDate[]>();
  for (const row of [...saved.values()].sort((a, b) => a.date.localeCompare(b.date))) {
    if (!row.themeId || row.text === null) continue;
    byIdea.set(row.themeId, [...(byIdea.get(row.themeId) ?? []), row.date]);
  }
  return byIdea;
}

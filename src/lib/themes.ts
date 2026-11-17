import { randomInt } from "node:crypto";
import { addDays, type GameDate, type Season } from "./time";

export type ThemeRow = { id: string; text: string };
/** A saved decision for one day. A null text means the day has no theme. */
export type DayThemeRow = { date: GameDate; text: string | null; themeId: string | null };

/** Every second day of the season is themed by default: the 2nd, 4th, 6th and so on. */
export function isDefaultThemed(season: Season, date: GameDate): boolean {
  for (let i = 0; i < season.days; i++) {
    if (addDays(season.start, i) === date) return i % 2 === 1;
  }
  return false;
}

/** Whether a day has a theme, without saying what it is. */
export function isThemed(season: Season, date: GameDate, saved: Map<GameDate, DayThemeRow>): boolean {
  const row = saved.get(date);
  return row ? row.text !== null : isDefaultThemed(season, date);
}

/**
 * Draws a theme at random, preferring ones no day has used yet. Once every
 * theme has been used, any of them can come up again.
 */
export function drawTheme(
  pool: ThemeRow[],
  saved: Iterable<DayThemeRow>,
  random: (max: number) => number = randomInt,
): ThemeRow | null {
  if (pool.length === 0) return null;
  const used = new Set<string>();
  for (const row of saved) if (row.themeId) used.add(row.themeId);
  const fresh = pool.filter((t) => !used.has(t.id));
  const from = fresh.length > 0 ? fresh : pool;
  return from[random(from.length)];
}

/** Open themed days that haven't had their theme drawn yet. */
export function datesNeedingDraw(
  season: Season,
  open: GameDate[],
  saved: Map<GameDate, DayThemeRow>,
): GameDate[] {
  return open.filter((d) => !saved.has(d) && isDefaultThemed(season, d));
}

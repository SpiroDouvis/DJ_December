// All game dates are calendar dates in Mountain Standard Time (fixed UTC-7),
// and a game day runs from 5:00 AM MST to 4:59 AM MST the next morning.

export const MST_OFFSET_HOURS = -7;
export const DAY_START_HOUR = 5;

/** A calendar date as "YYYY-MM-DD". */
export type GameDate = string;

const HOUR_MS = 3_600_000;
const DAY_MS = 24 * HOUR_MS;

/** The game day an instant belongs to. */
export function gameDateOf(instant: Date): GameDate {
  const shifted = instant.getTime() + (MST_OFFSET_HOURS - DAY_START_HOUR) * HOUR_MS;
  return new Date(shifted).toISOString().slice(0, 10);
}

/** The instant a game day opens (5:00 AM MST on that date). */
export function dayStartsAt(date: GameDate): Date {
  const midnightUtc = Date.parse(`${date}T00:00:00Z`);
  return new Date(midnightUtc + (DAY_START_HOUR - MST_OFFSET_HOURS) * HOUR_MS);
}

export function addDays(date: GameDate, days: number): GameDate {
  return new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS).toISOString().slice(0, 10);
}

export function isGameDate(value: string): value is GameDate {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(Date.parse(`${value}T00:00:00Z`));
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

/** "Dec 3" */
export function formatDate(date: GameDate): string {
  return `${MONTHS[Number(date.slice(5, 7)) - 1]} ${Number(date.slice(8, 10))}`;
}

export type Season = { start: GameDate; days: number };

/**
 * The season defaults to December 1 to 31 of the current year. SEASON_START and
 * SEASON_DAYS can move it, e.g. to run a trial week in November.
 */
export function seasonFromEnv(now: Date = new Date()): Season {
  const start = process.env.SEASON_START;
  const days = Number(process.env.SEASON_DAYS ?? 31);
  return {
    start: start && isGameDate(start) ? start : `${now.getUTCFullYear()}-12-01`,
    days: Number.isInteger(days) && days > 0 ? days : 31,
  };
}

export function seasonDates(season: Season): GameDate[] {
  return Array.from({ length: season.days }, (_, i) => addDays(season.start, i));
}

/** Season dates that have opened by `today`, oldest first. */
export function openDates(season: Season, today: GameDate): GameDate[] {
  return seasonDates(season).filter((d) => d <= today);
}

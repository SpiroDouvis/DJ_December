// Pure helpers for the calendar page: laying out months and working out what
// each day needs from the person looking at it.
import type { DayOutcome } from "./game";
import { seasonDates, type GameDate, type Season } from "./time";

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

export type CalendarMonth = {
  /** "December 2026" */
  label: string;
  /** Weeks run Sunday to Saturday. Null cells pad the first and last week. */
  weeks: (GameDate | null)[][];
};

/** Every month the season touches, with only season days filled in. */
export function calendarMonths(season: Season): CalendarMonth[] {
  const dates = seasonDates(season);
  const months: CalendarMonth[] = [];
  let current: { key: string; dates: GameDate[] } | null = null;
  const groups: { key: string; dates: GameDate[] }[] = [];
  for (const d of dates) {
    const key = d.slice(0, 7);
    if (!current || current.key !== key) {
      current = { key, dates: [] };
      groups.push(current);
    }
    current.dates.push(d);
  }
  for (const g of groups) {
    const cells: (GameDate | null)[] = [];
    const lead = new Date(`${g.dates[0]}T12:00:00Z`).getUTCDay();
    for (let i = 0; i < lead; i++) cells.push(null);
    cells.push(...g.dates);
    while (cells.length % 7 !== 0) cells.push(null);
    const weeks: (GameDate | null)[][] = [];
    for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));
    months.push({ label: `${MONTH_NAMES[Number(g.key.slice(5, 7)) - 1]} ${g.key.slice(0, 4)}`, weeks });
  }
  return months;
}

/** What a day still needs from one player: a song, ratings, both, or nothing. */
export type Owes = { song: boolean; ratings: number };

export function owesOn(outcome: DayOutcome, playerId: string): Owes {
  const r = outcome.current;
  return {
    song: r.missingSongs.some((p) => p.id === playerId),
    ratings: r.ratingsLeft.find((x) => x.player.id === playerId)?.count ?? 0,
  };
}

/**
 * How the calendar marks a day for one player. "missed" is a day before today
 * they still owe a song or ratings for (red outline and "!"). "todo" is today
 * when they still owe something.
 */
export function dayFlag(date: GameDate, today: GameDate, owes: Owes): "missed" | "todo" | null {
  if (!owes.song && owes.ratings === 0) return null;
  if (date < today) return "missed";
  if (date === today) return "todo";
  return null;
}


/** Where a day's details live: the calendar with that day picked. */
export const dayHref = (date: GameDate) => `/calendar?day=${date}`;

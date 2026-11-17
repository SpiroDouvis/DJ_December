import { isThemed, type DayThemeRow } from "./themes";
import { seasonDates, type GameDate, type Season } from "./time";

export type Availability = { status: "available" | "busy"; note: string | null };

/**
 * Why a player can't queue a song for a day, or null if they can. Songs can be
 * queued for any day that hasn't opened yet, except themed days, whose theme
 * stays secret until 5 AM.
 */
export function queueBlocker(
  date: GameDate,
  today: GameDate,
  season: Season,
  joinedOn: GameDate,
  saved: Map<GameDate, DayThemeRow>,
): string | null {
  if (!seasonDates(season).includes(date)) return "That day isn't part of the season.";
  if (date <= today) return "That day has already opened.";
  if (date < joinedOn) return "You're not playing that day.";
  if (isThemed(season, date, saved)) return "That's a theme day, so its song can't be queued.";
  return null;
}

export const availabilityKey = (playerId: string, date: GameDate) => `${playerId}:${date}`;

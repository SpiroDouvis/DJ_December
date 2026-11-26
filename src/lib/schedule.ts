import { seasonDates, type GameDate, type Season } from "./time";

/**
 * Why a player can't queue a song for a day, or null if they can. Songs can be
 * queued for any day of the season that hasn't opened yet, theme or not, since
 * everyone can see the themes on the calendar ahead of time.
 */
export function queueBlocker(date: GameDate, today: GameDate, season: Season, joinedOn: GameDate): string | null {
  if (!seasonDates(season).includes(date)) return "That day isn't part of the season.";
  if (date <= today) return "That day has already opened.";
  if (date < joinedOn) return "You're not playing that day.";
  return null;
}

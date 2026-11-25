// Pure helpers for admin test rounds: the stand-in songs fake players send, and
// working out which songs and ratings the simulator should fill in.
import { dayOutcome, owedDates, type Player, type Rating, type Submission } from "./game";
import type { GameDate } from "./time";

/**
 * Songs fake players send. They link to a Spotify search rather than a track, so
 * nothing needs looking up and every link still opens something sensible.
 */
export const TEST_SONGS: { title: string; artist: string }[] = [
  { title: "Dancing Queen", artist: "ABBA" },
  { title: "Mr. Brightside", artist: "The Killers" },
  { title: "Dreams", artist: "Fleetwood Mac" },
  { title: "Levitating", artist: "Dua Lipa" },
  { title: "Take On Me", artist: "a-ha" },
  { title: "September", artist: "Earth, Wind & Fire" },
  { title: "Bohemian Rhapsody", artist: "Queen" },
  { title: "Blinding Lights", artist: "The Weeknd" },
  { title: "Africa", artist: "Toto" },
  { title: "Hey Ya!", artist: "OutKast" },
  { title: "Don't Stop Me Now", artist: "Queen" },
  { title: "Wonderwall", artist: "Oasis" },
  { title: "Running Up That Hill", artist: "Kate Bush" },
  { title: "Get Lucky", artist: "Daft Punk" },
  { title: "Superstition", artist: "Stevie Wonder" },
  { title: "Last Christmas", artist: "Wham!" },
];

export function testSongRow(i: number) {
  const song = TEST_SONGS[i % TEST_SONGS.length];
  const query = encodeURIComponent(`${song.title} ${song.artist}`);
  return {
    song_key: `TEST_SONG::${i % TEST_SONGS.length}`,
    title: song.title,
    artist: song.artist,
    artwork_url: null,
    spotify_url: `https://open.spotify.com/search/${query}`,
    apple_music_url: null,
  };
}

/** Names for fake players beyond the copies of real players. */
export const FAKE_NAMES = ["Test Ana", "Test Ben", "Test Cleo", "Test Dev", "Test Eli", "Test Fay"];

export const MAX_TEST_PLAYERS = 5;
export const MAX_TEST_DAYS = 14;

export type PlannedSong = { playerId: string; date: GameDate; round: number };
export type PlannedRating = { submissionId: string; raterId: string };

/**
 * Songs the given players still owe on open days: missed main-round songs and
 * tiebreak songs for rounds being played now.
 */
export function planSongs(
  playerIds: string[],
  open: GameDate[],
  players: Player[],
  submissions: Submission[],
  ratings: Rating[],
): PlannedSong[] {
  const ids = new Set(playerIds);
  const planned: PlannedSong[] = [];
  for (const id of playerIds) {
    for (const date of owedDates(id, open, players, submissions)) planned.push({ playerId: id, date, round: 1 });
  }
  for (const date of open) {
    const current = dayOutcome(date, players, submissions, ratings).current;
    if (current.round === 1) continue;
    for (const p of current.missingSongs) {
      if (ids.has(p.id)) planned.push({ playerId: p.id, date, round: current.round });
    }
  }
  return planned;
}

/** Ratings the given players still owe in rounds being played on open days. */
export function planRatings(
  playerIds: string[],
  open: GameDate[],
  players: Player[],
  submissions: Submission[],
  ratings: Rating[],
): PlannedRating[] {
  const ids = new Set(playerIds);
  const done = new Set(ratings.map((r) => `${r.raterId}:${r.submissionId}`));
  const planned: PlannedRating[] = [];
  for (const date of open) {
    const current = dayOutcome(date, players, submissions, ratings).current;
    if (current.revealed) continue;
    for (const rater of current.raters) {
      if (!ids.has(rater.id)) continue;
      for (const s of current.submissions) {
        if (s.playerId !== rater.id && !done.has(`${rater.id}:${s.id}`)) {
          planned.push({ submissionId: s.id, raterId: rater.id });
        }
      }
    }
  }
  return planned;
}

export type ScoreMode = "random" | "same";

/** A random score from 3 to 10 in half points, or a flat 7 to force ties. */
export function simulatedScore(mode: ScoreMode, random: () => number = Math.random): number {
  if (mode === "same") return 7;
  return 3 + Math.floor(random() * 15) / 2;
}

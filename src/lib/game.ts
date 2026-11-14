import type { GameDate } from "./time";

export type Player = {
  id: string;
  name: string;
  /** The first game day this player takes part in. */
  joinedOn: GameDate;
};

export type Submission = {
  id: string;
  playerId: string;
  date: GameDate;
  songId: string;
};

export type Rating = {
  submissionId: string;
  raterId: string;
  score: number;
};

export const MIN_SCORE = 1;
export const MAX_SCORE = 10;

/** Scores run 1 to 10 in half points. */
export function isValidScore(score: number): boolean {
  return (
    Number.isFinite(score) &&
    score >= MIN_SCORE &&
    score <= MAX_SCORE &&
    Number.isInteger(score * 2)
  );
}

export const SCORE_OPTIONS: number[] = Array.from(
  { length: (MAX_SCORE - MIN_SCORE) * 2 + 1 },
  (_, i) => MIN_SCORE + i / 2,
);

/** Players who owe a song on this date. */
export function playersInDay(date: GameDate, players: Player[]): Player[] {
  return players.filter((p) => p.joinedOn <= date);
}

/**
 * Open dates a player still owes a song for, oldest first. A late player has to
 * fill these in order, so the first entry is the only date they can submit for.
 */
export function owedDates(
  playerId: string,
  open: GameDate[],
  players: Player[],
  submissions: Submission[],
): GameDate[] {
  const player = players.find((p) => p.id === playerId);
  if (!player) return [];
  const done = new Set(submissions.filter((s) => s.playerId === playerId).map((s) => s.date));
  return open.filter((d) => d >= player.joinedOn && !done.has(d));
}

export type SongResult = {
  submission: Submission;
  total: number;
  /** Rank 1 is the best; tied songs share a rank. */
  rank: number;
};

export type DayStatus = {
  date: GameDate;
  players: Player[];
  submissions: Submission[];
  /** Players who haven't sent their song for this day yet. */
  missingSongs: Player[];
  /** Players with ratings still to give, and how many. */
  ratingsLeft: { player: Player; count: number }[];
  revealed: boolean;
  /** Only filled in once the day is revealed. */
  results: SongResult[] | null;
  /** Submissions sharing the top total. More than one means a tiebreak is needed. */
  leaders: Submission[];
};

/**
 * Where a day stands. It is revealed only once every player in the day has
 * submitted and every player has rated every song except their own.
 */
export function dayStatus(
  date: GameDate,
  allPlayers: Player[],
  allSubmissions: Submission[],
  allRatings: Rating[],
): DayStatus {
  const players = playersInDay(date, allPlayers);
  const ids = new Set(players.map((p) => p.id));
  const submissions = allSubmissions.filter((s) => s.date === date && ids.has(s.playerId));
  const subIds = new Set(submissions.map((s) => s.id));
  const ratings = allRatings.filter((r) => subIds.has(r.submissionId) && ids.has(r.raterId));

  const submitted = new Set(submissions.map((s) => s.playerId));
  const missingSongs = players.filter((p) => !submitted.has(p.id));

  const rated = new Set(ratings.map((r) => `${r.raterId}:${r.submissionId}`));
  const ratingsLeft = players
    .map((player) => ({
      player,
      count: submissions.filter(
        (s) => s.playerId !== player.id && !rated.has(`${player.id}:${s.id}`),
      ).length,
    }))
    .filter((x) => x.count > 0);

  const revealed = players.length > 0 && missingSongs.length === 0 && ratingsLeft.length === 0;

  let results: SongResult[] | null = null;
  let leaders: Submission[] = [];
  if (revealed) {
    const totals = submissions.map((submission) => ({
      submission,
      total: ratings
        .filter((r) => r.submissionId === submission.id)
        .reduce((sum, r) => sum + r.score, 0),
    }));
    totals.sort((a, b) => b.total - a.total);
    results = totals.map((t) => ({
      ...t,
      rank: 1 + totals.filter((o) => o.total > t.total).length,
    }));
    leaders = results.filter((r) => r.rank === 1).map((r) => r.submission);
  }

  return { date, players, submissions, missingSongs, ratingsLeft, revealed, results, leaders };
}

/**
 * A stable order for songs on an unrevealed day, so neither the order songs came
 * in nor the player list gives away who sent what.
 */
export function shuffledForDisplay<T extends { id: string }>(items: T[]): T[] {
  const key = (id: string) => {
    let h = 2166136261;
    for (let i = 0; i < id.length; i++) {
      h ^= id.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };
  return [...items].sort((a, b) => key(a.id) - key(b.id));
}

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
  /** 1 for the day's main round, 2 and up for tiebreaks. */
  round: number;
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
  const done = new Set(
    submissions.filter((s) => s.playerId === playerId && s.round === 1).map((s) => s.date),
  );
  return open.filter((d) => d >= player.joinedOn && !done.has(d));
}

export type SongResult = {
  submission: Submission;
  total: number;
  /** Rank 1 is the best; tied songs share a rank. */
  rank: number;
};

export type RoundStatus = {
  date: GameDate;
  /** 1 is the day's main round; 2 and up are tiebreaks. */
  round: number;
  /** Players who send a song this round. */
  submitters: Player[];
  /** Players who rate this round's songs (never their own). */
  raters: Player[];
  submissions: Submission[];
  /** Submitters who haven't sent their song yet. */
  missingSongs: Player[];
  /** Raters with ratings still to give, and how many. */
  ratingsLeft: { player: Player; count: number }[];
  revealed: boolean;
  /** Only filled in once the round is revealed. */
  results: SongResult[] | null;
  /** Submissions sharing the top total. More than one means another tiebreak. */
  leaders: Submission[];
};

/**
 * Where one round stands. It is revealed only once every submitter has sent a
 * song and every rater has rated every song except their own.
 */
export function roundStatus(
  date: GameDate,
  round: number,
  submitters: Player[],
  raters: Player[],
  allSubmissions: Submission[],
  allRatings: Rating[],
): RoundStatus {
  const submitterIds = new Set(submitters.map((p) => p.id));
  const raterIds = new Set(raters.map((p) => p.id));
  const submissions = allSubmissions.filter(
    (s) => s.date === date && s.round === round && submitterIds.has(s.playerId),
  );
  const subIds = new Set(submissions.map((s) => s.id));
  const ratings = allRatings.filter((r) => subIds.has(r.submissionId) && raterIds.has(r.raterId));

  const submitted = new Set(submissions.map((s) => s.playerId));
  const missingSongs = submitters.filter((p) => !submitted.has(p.id));

  const rated = new Set(ratings.map((r) => `${r.raterId}:${r.submissionId}`));
  const ratingsLeft = raters
    .map((player) => ({
      player,
      count: submissions.filter(
        (s) => s.playerId !== player.id && !rated.has(`${player.id}:${s.id}`),
      ).length,
    }))
    .filter((x) => x.count > 0);

  const revealed = submitters.length > 0 && missingSongs.length === 0 && ratingsLeft.length === 0;

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

  return {
    date,
    round,
    submitters,
    raters,
    submissions,
    missingSongs,
    ratingsLeft,
    revealed,
    results,
    leaders,
  };
}

/** Rounds can't really run away, since each needs new songs, but stop somewhere. */
const MAX_ROUNDS = 25;

export type DayOutcome = {
  date: GameDate;
  players: Player[];
  /** The main round first, then any tiebreaks, in order. */
  rounds: RoundStatus[];
  /** The round still being played, or the last one if the day is decided. */
  current: RoundStatus;
  /** The winning song once the day is decided, else null. */
  winner: Submission | null;
};

/**
 * Plays out a day. A tie at the top starts a tiebreak: the tied players each
 * send another song and only the other players rate them. If every player in
 * the round tied, the round simply repeats with everyone sending and rating.
 */
export function dayOutcome(
  date: GameDate,
  allPlayers: Player[],
  allSubmissions: Submission[],
  allRatings: Rating[],
): DayOutcome {
  const players = playersInDay(date, allPlayers);
  const rounds: RoundStatus[] = [];
  let submitters = players;
  let raters = players;

  for (let round = 1; round <= MAX_ROUNDS; round++) {
    const status = roundStatus(date, round, submitters, raters, allSubmissions, allRatings);
    rounds.push(status);
    if (!status.revealed || status.leaders.length < 2) break;

    const tiedIds = new Set(status.leaders.map((s) => s.playerId));
    const tied = submitters.filter((p) => tiedIds.has(p.id));
    const others = players.filter((p) => !tiedIds.has(p.id));
    submitters = tied;
    raters = others.length > 0 ? others : tied;
  }

  const current = rounds.at(-1)!;
  const winner = current.revealed && current.leaders.length === 1 ? current.leaders[0] : null;
  return { date, players, rounds, current, winner };
}

/** The main round of a day, as before tiebreaks existed. */
export function dayStatus(
  date: GameDate,
  allPlayers: Player[],
  allSubmissions: Submission[],
  allRatings: Rating[],
): RoundStatus {
  return dayOutcome(date, allPlayers, allSubmissions, allRatings).rounds[0];
}

export type OwedTiebreak = { date: GameDate; round: number };

/** Tiebreak rounds this player is in and hasn't sent a song for, oldest first. */
export function owedTiebreaks(playerId: string, outcomes: DayOutcome[]): OwedTiebreak[] {
  return outcomes
    .map((o) => o.current)
    .filter(
      (r) =>
        r.round > 1 &&
        r.missingSongs.some((p) => p.id === playerId),
    )
    .map((r) => ({ date: r.date, round: r.round }));
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

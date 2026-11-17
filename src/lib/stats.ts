import type { DayOutcome, Player, Rating } from "./game";

export type PlayerStats = {
  player: Player;
  wins: number;
  /** Revealed main-round songs this player sent. */
  songs: number;
  /** Total points received across those songs. */
  pointsReceived: number;
  /** Average rating received, per rating. */
  avgReceived: number | null;
  ratingsGiven: number;
  avgGiven: number | null;
  /** Who this player rates highest and lowest on average (needs 2+ ratings each). */
  favourite: { player: Player; avg: number } | null;
  toughest: { player: Player; avg: number } | null;
};

export type PairStat = { avg: number; count: number };

export type Stats = {
  players: PlayerStats[];
  /** pairs.get(raterId)?.get(submitterId): the rater's average rating for that player's songs. */
  pairs: Map<string, Map<string, PairStat>>;
  revealedDays: number;
};

const avg = (sum: number, count: number) => (count === 0 ? null : sum / count);

/**
 * Season stats from revealed rounds only, so nobody's hidden ratings leak. Wins
 * come from decided days. Tiebreak ratings count toward who-rates-whom, but songs
 * and points received use main rounds so every player's numbers compare fairly.
 */
export function computeStats(players: Player[], outcomes: DayOutcome[], ratings: Rating[]): Stats {
  const revealedRounds = outcomes.flatMap((o) => o.rounds.filter((r) => r.revealed));
  const submissionById = new Map(revealedRounds.flatMap((r) => r.submissions).map((s) => [s.id, s]));
  const visible = ratings.filter((r) => submissionById.has(r.submissionId));

  const pairSums = new Map<string, Map<string, { sum: number; count: number }>>();
  for (const r of visible) {
    const target = submissionById.get(r.submissionId)!.playerId;
    if (!pairSums.has(r.raterId)) pairSums.set(r.raterId, new Map());
    const row = pairSums.get(r.raterId)!;
    const cell = row.get(target) ?? { sum: 0, count: 0 };
    cell.sum += r.score;
    cell.count += 1;
    row.set(target, cell);
  }
  const pairs = new Map<string, Map<string, PairStat>>();
  for (const [rater, row] of pairSums) {
    pairs.set(
      rater,
      new Map([...row].map(([target, c]) => [target, { avg: c.sum / c.count, count: c.count }])),
    );
  }

  const mainResults = outcomes.flatMap((o) => (o.rounds[0].revealed ? (o.rounds[0].results ?? []) : []));

  const stats = players.map((player): PlayerStats => {
    const mine = mainResults.filter((r) => r.submission.playerId === player.id);
    const mineIds = new Set(mine.map((r) => r.submission.id));
    const received = visible.filter((r) => mineIds.has(r.submissionId));
    const given = visible.filter((r) => r.raterId === player.id);

    const towards = [...(pairs.get(player.id) ?? new Map<string, PairStat>())]
      .filter(([, p]) => p.count >= 2)
      .map(([id, p]) => ({ player: players.find((x) => x.id === id), avg: p.avg }))
      .filter((x): x is { player: Player; avg: number } => x.player !== undefined)
      .sort((a, b) => b.avg - a.avg);

    return {
      player,
      wins: outcomes.filter((o) => o.winner?.playerId === player.id).length,
      songs: mine.length,
      pointsReceived: mine.reduce((sum, r) => sum + r.total, 0),
      avgReceived: avg(
        received.reduce((sum, r) => sum + r.score, 0),
        received.length,
      ),
      ratingsGiven: given.length,
      avgGiven: avg(
        given.reduce((sum, r) => sum + r.score, 0),
        given.length,
      ),
      favourite: towards.length >= 2 ? towards[0] : null,
      toughest: towards.length >= 2 ? towards.at(-1)! : null,
    };
  });

  stats.sort(
    (a, b) =>
      b.wins - a.wins ||
      (b.avgReceived ?? 0) - (a.avgReceived ?? 0) ||
      a.player.name.localeCompare(b.player.name),
  );

  return {
    players: stats,
    pairs,
    revealedDays: outcomes.filter((o) => o.rounds[0].revealed).length,
  };
}

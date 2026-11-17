import { describe, expect, it } from "vitest";
import { dayOutcome, dayStatus, isValidScore, owedDates, owedTiebreaks, type Player, type Rating, type Submission } from "@/lib/game";

const players: Player[] = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase(), joinedOn: "2026-11-01" }));
const D = "2026-12-01";
const subs: Submission[] = players.map((p) => ({ id: `s-${p.id}`, playerId: p.id, date: D, round: 1, songId: `song-${p.id}` }));

function rateAll(scores: Record<string, Record<string, number>>): Rating[] {
  return Object.entries(scores).flatMap(([rater, given]) =>
    Object.entries(given).map(([target, score]) => ({ raterId: rater, submissionId: `s-${target}`, score })),
  );
}

describe("isValidScore", () => {
  it("allows 1 to 10 in half points", () => {
    for (const s of [1, 1.5, 6.5, 10]) expect(isValidScore(s)).toBe(true);
    for (const s of [0, 0.5, 10.5, 6.3, NaN]) expect(isValidScore(s)).toBe(false);
  });
});

describe("owedDates", () => {
  const open = ["2026-12-01", "2026-12-02", "2026-12-03"];
  it("lists missed days oldest first", () => {
    expect(owedDates("a", open, players, [subs[0]])).toEqual(["2026-12-02", "2026-12-03"]);
  });
  it("skips days before a player joined", () => {
    const late: Player[] = [...players, { id: "d", name: "D", joinedOn: "2026-12-03" }];
    expect(owedDates("d", open, late, [])).toEqual(["2026-12-03"]);
  });
});

describe("dayStatus", () => {
  it("waits for missing songs and names who is slacking", () => {
    const st = dayStatus(D, players, subs.slice(0, 2), []);
    expect(st.revealed).toBe(false);
    expect(st.missingSongs.map((p) => p.id)).toEqual(["c"]);
    expect(st.ratingsLeft.map((x) => [x.player.id, x.count])).toEqual([["a", 1], ["b", 1], ["c", 2]]);
    expect(st.results).toBeNull();
  });

  it("stays hidden until every rating is in", () => {
    const ratings = rateAll({ a: { b: 7, c: 8 }, b: { a: 6, c: 9 }, c: { a: 5 } });
    const st = dayStatus(D, players, subs, ratings);
    expect(st.revealed).toBe(false);
    expect(st.ratingsLeft).toEqual([{ player: players[2], count: 1 }]);
  });

  it("reveals totals and the winner", () => {
    const ratings = rateAll({ a: { b: 7, c: 8.5 }, b: { a: 6, c: 9 }, c: { a: 5, b: 7.5 } });
    const st = dayStatus(D, players, subs, ratings);
    expect(st.revealed).toBe(true);
    expect(st.results!.map((r) => [r.submission.playerId, r.total, r.rank])).toEqual([
      ["c", 17.5, 1],
      ["b", 14.5, 2],
      ["a", 11, 3],
    ]);
    expect(st.leaders.map((s) => s.playerId)).toEqual(["c"]);
  });

  it("reports ties as several leaders", () => {
    const ratings = rateAll({ a: { b: 8, c: 8 }, b: { a: 6, c: 9 }, c: { a: 5, b: 9 } });
    const st = dayStatus(D, players, subs, ratings);
    expect(st.leaders.map((s) => s.playerId).sort()).toEqual(["b", "c"]);
    expect(st.results!.filter((r) => r.rank === 1)).toHaveLength(2);
  });

  it("ignores ratings on your own song", () => {
    const ratings = [
      ...rateAll({ a: { b: 7, c: 8 }, b: { a: 6, c: 9 }, c: { a: 5, b: 7 } }),
      { raterId: "a", submissionId: "s-a", score: 10 },
    ];
    // A self-rating can't be stored (the database refuses it), but even if one were, it isn't owed.
    expect(dayStatus(D, players, subs, ratings).revealed).toBe(true);
  });
});

describe("tiebreaks", () => {
  const four: Player[] = ["a", "b", "c", "d"].map((id) => ({ id, name: id.toUpperCase(), joinedOn: "2026-11-01" }));
  const r1: Submission[] = four.map((p) => ({ id: `s-${p.id}`, playerId: p.id, date: D, round: 1, songId: "x" }));
  const rate = (round: number, scores: Record<string, Record<string, number>>): Rating[] =>
    Object.entries(scores).flatMap(([rater, given]) =>
      Object.entries(given).map(([target, score]) => ({
        raterId: rater,
        submissionId: round === 1 ? `s-${target}` : `t${round}-${target}`,
        score,
      })),
    );
  // a and b tie on 20; c gets 18, d gets 15.
  const tiedRatings = rate(1, {
    a: { b: 7, c: 6, d: 5 },
    b: { a: 7, c: 6, d: 5 },
    c: { a: 7, b: 7, d: 5 },
    d: { a: 6, b: 6, c: 6 },
  });
  const tb = (round: number, ids: string[]): Submission[] =>
    ids.map((id) => ({ id: `t${round}-${id}`, playerId: id, date: D, round, songId: "y" }));

  it("starts a tiebreak for the tied players, rated by everyone else", () => {
    const o = dayOutcome(D, four, r1, tiedRatings);
    expect(o.rounds).toHaveLength(2);
    expect(o.winner).toBeNull();
    expect(o.current.round).toBe(2);
    expect(o.current.submitters.map((p) => p.id)).toEqual(["a", "b"]);
    expect(o.current.raters.map((p) => p.id)).toEqual(["c", "d"]);
    expect(o.current.missingSongs.map((p) => p.id)).toEqual(["a", "b"]);
    expect(owedTiebreaks("a", [o])).toEqual([{ date: D, round: 2 }]);
    expect(owedTiebreaks("c", [o])).toEqual([]);
  });

  it("waits for only the non-tied raters, then crowns the winner", () => {
    const subs = [...r1, ...tb(2, ["a", "b"])];
    const halfway = dayOutcome(D, four, subs, [...tiedRatings, ...rate(2, { c: { a: 8, b: 7 } })]);
    expect(halfway.current.ratingsLeft.map((x) => x.player.id)).toEqual(["d"]);
    const done = dayOutcome(D, four, subs, [
      ...tiedRatings,
      ...rate(2, { c: { a: 8, b: 7 }, d: { a: 6, b: 6.5 } }),
    ]);
    expect(done.winner?.playerId).toBe("a");
    expect(done.winner?.round).toBe(2);
  });

  it("keeps going while the tiebreak ties again", () => {
    const subs = [...r1, ...tb(2, ["a", "b"])];
    const o = dayOutcome(D, four, subs, [...tiedRatings, ...rate(2, { c: { a: 8, b: 7 }, d: { a: 6, b: 7 } })]);
    expect(o.current.round).toBe(3);
    expect(o.current.submitters.map((p) => p.id)).toEqual(["a", "b"]);
    expect(o.current.raters.map((p) => p.id)).toEqual(["c", "d"]);
  });

  it("repeats the round with everyone when everyone ties", () => {
    const all = rate(1, {
      a: { b: 6, c: 6, d: 6 },
      b: { a: 6, c: 6, d: 6 },
      c: { a: 6, b: 6, d: 6 },
      d: { a: 6, b: 6, c: 6 },
    });
    const o = dayOutcome(D, four, r1, all);
    expect(o.current.round).toBe(2);
    expect(o.current.submitters.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
    expect(o.current.raters.map((p) => p.id)).toEqual(["a", "b", "c", "d"]);
  });

  it("doesn't count a tiebreak song as the main-round song", () => {
    expect(owedDates("a", [D], four, tb(2, ["a"]))).toEqual([D]);
  });
});

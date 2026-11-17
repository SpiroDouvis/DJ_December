import { describe, expect, it } from "vitest";
import { dayOutcome, type Player, type Rating, type Submission } from "@/lib/game";
import { computeStats } from "@/lib/stats";

const players: Player[] = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase(), joinedOn: "2026-11-01" }));
const day = (date: string, prefix: string): Submission[] =>
  players.map((p) => ({ id: `${prefix}-${p.id}`, playerId: p.id, date, round: 1, songId: "x" }));
const rate = (prefix: string, scores: Record<string, Record<string, number>>): Rating[] =>
  Object.entries(scores).flatMap(([rater, given]) =>
    Object.entries(given).map(([target, score]) => ({ raterId: rater, submissionId: `${prefix}-${target}`, score })),
  );

const subs = [...day("2026-12-01", "d1"), ...day("2026-12-02", "d2"), ...day("2026-12-03", "d3")];
const ratings = [
  // Dec 1: c wins (a 11, b 14, c 17).
  ...rate("d1", { a: { b: 7, c: 9 }, b: { a: 6, c: 8 }, c: { a: 5, b: 7 } }),
  // Dec 2: a wins (a 18, b 10, c 12).
  ...rate("d2", { a: { b: 4, c: 6 }, b: { a: 9, c: 6 }, c: { a: 9, b: 6 } }),
  // Dec 3: still open, b hasn't rated. These must not count.
  ...rate("d3", { a: { b: 10, c: 1 }, c: { a: 1, b: 10 } }),
];
const outcomes = ["2026-12-01", "2026-12-02", "2026-12-03"].map((d) => dayOutcome(d, players, subs, ratings));
const stats = computeStats(players, outcomes, ratings);
const of = (id: string) => stats.players.find((s) => s.player.id === id)!;

describe("computeStats", () => {
  it("counts wins and sorts by them", () => {
    expect(stats.revealedDays).toBe(2);
    expect(of("a").wins).toBe(1);
    expect(of("b").wins).toBe(0);
    expect(of("c").wins).toBe(1);
    expect(stats.players.at(-1)!.player.id).toBe("b");
  });

  it("averages ratings given and received from revealed days only", () => {
    expect(of("a").ratingsGiven).toBe(4);
    expect(of("a").avgGiven).toBe((7 + 9 + 4 + 6) / 4);
    expect(of("b").ratingsGiven).toBe(4);
    expect(of("a").songs).toBe(2);
    expect(of("a").pointsReceived).toBe(29);
    expect(of("a").avgReceived).toBe(29 / 4);
  });

  it("builds the who-rates-whom grid", () => {
    expect(stats.pairs.get("a")!.get("b")).toEqual({ avg: 5.5, count: 2 });
    expect(stats.pairs.get("c")!.get("a")).toEqual({ avg: 7, count: 2 });
    expect(stats.pairs.get("a")!.has("a")).toBe(false);
  });

  it("names each player's favourite and toughest-rated player", () => {
    expect(of("a").favourite?.player.id).toBe("c");
    expect(of("a").toughest?.player.id).toBe("b");
    expect(of("b").favourite?.player.id).toBe("a");
  });
});

import { describe, expect, it } from "vitest";
import { dayOutcome, isValidScore, type Player, type Rating, type Submission } from "@/lib/game";
import { planRatings, planSongs, simulatedScore, testSongRow, TEST_SONGS } from "@/lib/sandbox";

const players: Player[] = ["a", "b", "c"].map((id) => ({ id, name: id.toUpperCase(), joinedOn: "2026-12-01" }));
const open = ["2026-12-01", "2026-12-02"];
const ids = players.map((p) => p.id);

/** Plays the simulator the way the server action does: songs, then ratings. */
function fill(who: string[], subs: Submission[], ratings: Rating[], score: (r: Rating, subs: Submission[]) => number) {
  const songs = planSongs(who, open, players, subs, ratings);
  const newSubs = [
    ...subs,
    ...songs.map((s, i) => ({ id: `s${subs.length + i}`, playerId: s.playerId, date: s.date, round: s.round, songId: "x" })),
  ];
  const rates = planRatings(who, open, players, newSubs, ratings);
  return { subs: newSubs, ratings: [...ratings, ...rates.map((r) => ({ ...r, score: score({ ...r, score: 0 }, newSubs) }))] };
}

describe("planSongs", () => {
  it("fills every missed day for the chosen players only", () => {
    const planned = planSongs(["b", "c"], open, players, [], []);
    expect(planned).toEqual([
      { playerId: "b", date: "2026-12-01", round: 1 },
      { playerId: "b", date: "2026-12-02", round: 1 },
      { playerId: "c", date: "2026-12-01", round: 1 },
      { playerId: "c", date: "2026-12-02", round: 1 },
    ]);
  });
});

describe("planRatings", () => {
  it("never has a player rate their own song or rate twice", () => {
    const { subs, ratings } = fill(ids, [], [], () => 5);
    expect(ratings).toHaveLength(2 * 3 * 2);
    for (const r of ratings) {
      expect(subs.find((s) => s.id === r.submissionId)!.playerId).not.toBe(r.raterId);
    }
    expect(planRatings(ids, open, players, subs, ratings)).toEqual([]);
  });

  it("leaves the player you're playing as to rate by hand", () => {
    const { subs, ratings } = fill(["b", "c"], [], [], () => 5);
    expect(ratings.some((r) => r.raterId === "a")).toBe(false);
    expect(dayOutcome("2026-12-01", players, subs, ratings).current.missingSongs.map((p) => p.id)).toEqual(["a"]);
  });
});

describe("simulating a tie", () => {
  it("plays the tiebreak when run again", () => {
    // Everyone gives 7, so all three tie and the round repeats with everyone.
    let state = fill(ids, [], [], () => 7);
    expect(dayOutcome("2026-12-01", players, state.subs, state.ratings).current.round).toBe(2);
    // Then a's tiebreak song gets the best scores and wins.
    state = fill(ids, state.subs, state.ratings, (r, subs) =>
      subs.find((s) => s.id === r.submissionId)!.playerId === "a" ? 9 : 5,
    );
    const outcome = dayOutcome("2026-12-01", players, state.subs, state.ratings);
    expect(outcome.rounds).toHaveLength(2);
    expect(outcome.winner?.playerId).toBe("a");
  });
});

describe("simulatedScore", () => {
  it("gives valid scores", () => {
    for (const x of [0, 0.3, 0.5, 0.99]) expect(isValidScore(simulatedScore("random", () => x))).toBe(true);
    expect(simulatedScore("same")).toBe(7);
  });
});

describe("testSongRow", () => {
  it("links to a Spotify search and reuses keys", () => {
    const row = testSongRow(1);
    expect(row.spotify_url).toBe("https://open.spotify.com/search/Mr.%20Brightside%20The%20Killers");
    expect(testSongRow(1 + TEST_SONGS.length).song_key).toBe(row.song_key);
  });
});

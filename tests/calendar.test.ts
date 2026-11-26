import { describe, expect, it } from "vitest";
import { calendarMonths, dayFlag, owesOn } from "@/lib/calendar";
import { dayOutcome, type Player, type Rating, type Submission } from "@/lib/game";

describe("calendarMonths", () => {
  it("lays December 2026 out Sunday to Saturday", () => {
    const [dec] = calendarMonths({ start: "2026-12-01", days: 31 });
    expect(dec.label).toBe("December 2026");
    // Dec 1 2026 is a Tuesday.
    expect(dec.weeks[0]).toEqual([null, null, "2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04", "2026-12-05"]);
    expect(dec.weeks.at(-1)).toEqual(["2026-12-27", "2026-12-28", "2026-12-29", "2026-12-30", "2026-12-31", null, null]);
    expect(dec.weeks.flat().filter(Boolean)).toHaveLength(31);
  });
  it("splits a season that crosses months", () => {
    const months = calendarMonths({ start: "2026-11-28", days: 7 });
    expect(months.map((m) => m.label)).toEqual(["November 2026", "December 2026"]);
    expect(months[0].weeks.flat().filter(Boolean)).toEqual(["2026-11-28", "2026-11-29", "2026-11-30"]);
  });
});

describe("dayFlag", () => {
  const players: Player[] = [
    { id: "a", name: "A", joinedOn: "2026-12-01" },
    { id: "b", name: "B", joinedOn: "2026-12-01" },
  ];
  const subs: Submission[] = [
    { id: "s1", playerId: "a", date: "2026-12-01", round: 1, songId: "x" },
    { id: "s2", playerId: "b", date: "2026-12-01", round: 1, songId: "y" },
  ];
  const ratings: Rating[] = [{ submissionId: "s2", raterId: "a", score: 7 }];
  const outcome = dayOutcome("2026-12-01", players, subs, ratings);

  it("marks a past day the player still has to rate as missed", () => {
    expect(owesOn(outcome, "b")).toEqual({ song: false, ratings: 1 });
    expect(dayFlag("2026-12-01", "2026-12-02", owesOn(outcome, "b"))).toBe("missed");
  });
  it("marks today as to do, not missed", () => {
    expect(dayFlag("2026-12-01", "2026-12-01", owesOn(outcome, "b"))).toBe("todo");
  });
  it("leaves finished days alone", () => {
    expect(owesOn(outcome, "a")).toEqual({ song: false, ratings: 0 });
    expect(dayFlag("2026-12-01", "2026-12-02", owesOn(outcome, "a"))).toBeNull();
  });
  it("flags a missed song", () => {
    const o = dayOutcome("2026-12-01", players, [subs[0]], []);
    expect(owesOn(o, "b").song).toBe(true);
    expect(dayFlag("2026-12-01", "2026-12-03", owesOn(o, "b"))).toBe("missed");
  });
});

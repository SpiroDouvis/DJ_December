import { describe, expect, it } from "vitest";
import { addDays, dayStartsAt, formatDate, gameDateOf, openDates } from "@/lib/time";

describe("gameDateOf", () => {
  it("rolls over at 5am MST (12:00 UTC)", () => {
    expect(gameDateOf(new Date("2026-12-03T11:59:59Z"))).toBe("2026-12-02");
    expect(gameDateOf(new Date("2026-12-03T12:00:00Z"))).toBe("2026-12-03");
  });
  it("keeps late evening MST on the same day", () => {
    // 11pm MST on Dec 3 is 06:00 UTC on Dec 4.
    expect(gameDateOf(new Date("2026-12-04T06:00:00Z"))).toBe("2026-12-03");
  });
  it("round-trips with dayStartsAt", () => {
    expect(dayStartsAt("2026-12-03").toISOString()).toBe("2026-12-03T12:00:00.000Z");
    expect(gameDateOf(dayStartsAt("2026-12-31"))).toBe("2026-12-31");
  });
});

describe("dates", () => {
  it("adds days across months", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });
  it("formats", () => expect(formatDate("2026-12-03")).toBe("Dec 3"));
  it("lists only opened days", () => {
    const season = { start: "2026-12-01", days: 31 };
    expect(openDates(season, "2026-11-30")).toEqual([]);
    expect(openDates(season, "2026-12-03")).toEqual(["2026-12-01", "2026-12-02", "2026-12-03"]);
    expect(openDates(season, "2027-01-05")).toHaveLength(31);
  });
});

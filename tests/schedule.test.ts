import { describe, expect, it } from "vitest";
import { queueBlocker } from "@/lib/schedule";
import type { DayThemeRow } from "@/lib/themes";

const season = { start: "2026-12-01", days: 31 };
const none = new Map<string, DayThemeRow>();

describe("queueBlocker", () => {
  it("allows future days without a theme", () => {
    expect(queueBlocker("2026-12-05", "2026-12-02", season, "2026-11-01", none)).toBeNull();
    expect(queueBlocker("2026-12-01", "2026-11-20", season, "2026-11-01", none)).toBeNull();
  });
  it("blocks theme days, including ones an admin themed", () => {
    expect(queueBlocker("2026-12-04", "2026-12-02", season, "2026-11-01", none)).toMatch(/theme/);
    const saved = new Map<string, DayThemeRow>([
      ["2026-12-05", { date: "2026-12-05", text: "Custom", themeId: null }],
      ["2026-12-06", { date: "2026-12-06", text: null, themeId: null }],
    ]);
    expect(queueBlocker("2026-12-05", "2026-12-02", season, "2026-11-01", saved)).toMatch(/theme/);
    expect(queueBlocker("2026-12-06", "2026-12-02", season, "2026-11-01", saved)).toBeNull();
  });
  it("blocks days that have opened or fall outside the season", () => {
    expect(queueBlocker("2026-12-02", "2026-12-02", season, "2026-11-01", none)).toMatch(/opened/);
    expect(queueBlocker("2027-01-01", "2026-12-02", season, "2026-11-01", none)).toMatch(/season/);
  });
  it("blocks days before a player joins", () => {
    expect(queueBlocker("2026-12-05", "2026-12-02", season, "2026-12-07", none)).toMatch(/not playing/);
  });
});

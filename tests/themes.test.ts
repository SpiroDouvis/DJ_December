import { describe, expect, it } from "vitest";
import { datesNeedingDraw, drawTheme, isDefaultThemed, isThemed, usedOn, type DayThemeRow } from "@/lib/themes";

const season = { start: "2026-12-01", days: 31 };

describe("default themed days", () => {
  it("themes every second day", () => {
    expect(isDefaultThemed(season, "2026-12-01")).toBe(false);
    expect(isDefaultThemed(season, "2026-12-02")).toBe(true);
    expect(isDefaultThemed(season, "2026-12-03")).toBe(false);
    expect(isDefaultThemed(season, "2026-12-30")).toBe(true);
    expect(isDefaultThemed(season, "2026-12-31")).toBe(false);
    expect(isDefaultThemed(season, "2027-01-01")).toBe(false);
  });
  it("lets a saved choice override the default", () => {
    const saved = new Map<string, DayThemeRow>([
      ["2026-12-02", { date: "2026-12-02", text: null, themeId: null }],
      ["2026-12-03", { date: "2026-12-03", text: "Custom", themeId: null }],
    ]);
    expect(isThemed(season, "2026-12-02", saved)).toBe(false);
    expect(isThemed(season, "2026-12-03", saved)).toBe(true);
    expect(isThemed(season, "2026-12-04", saved)).toBe(true);
  });
});

describe("drawTheme", () => {
  const pool = [
    { id: "a", text: "A" },
    { id: "b", text: "B" },
    { id: "c", text: "C" },
  ];
  it("prefers unused themes", () => {
    const saved = [
      { date: "2026-12-02", text: "A", themeId: "a" },
      { date: "2026-12-04", text: "C", themeId: "c" },
    ];
    expect(drawTheme(pool, saved, () => 0)?.id).toBe("b");
  });
  it("reuses themes once all are used", () => {
    const saved = pool.map((t, i) => ({ date: `2026-12-0${i + 2}`, text: t.text, themeId: t.id }));
    expect(drawTheme(pool, saved, () => 2)?.id).toBe("c");
  });
  it("returns null for an empty pool", () => {
    expect(drawTheme([], [])).toBeNull();
  });
});

describe("datesNeedingDraw", () => {
  it("lists open themed days without a saved theme", () => {
    const saved = new Map<string, DayThemeRow>([
      ["2026-12-02", { date: "2026-12-02", text: "A", themeId: "a" }],
    ]);
    const open = ["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"];
    expect(datesNeedingDraw(season, open, saved)).toEqual(["2026-12-04"]);
  });
});

describe("usedOn", () => {
  it("only reports ideas used on days that have opened", () => {
    const saved = new Map<string, DayThemeRow>([
      ["2026-12-02", { date: "2026-12-02", text: "A", themeId: "a" }],
      ["2026-12-03", { date: "2026-12-03", text: "Custom", themeId: null }],
      ["2026-12-06", { date: "2026-12-06", text: "B", themeId: "b" }],
    ]);
    const used = usedOn(["2026-12-01", "2026-12-02", "2026-12-03", "2026-12-04"], saved);
    expect([...used]).toEqual([["a", "2026-12-02"]]);
  });
});

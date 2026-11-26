import { describe, expect, it } from "vitest";
import { daysByIdea, drawTheme, type DayThemeRow } from "@/lib/themes";

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

describe("daysByIdea", () => {
  it("lists every day an idea is on, earliest first, future days included", () => {
    const saved = new Map<string, DayThemeRow>([
      ["2026-12-20", { date: "2026-12-20", text: "A", themeId: "a" }],
      ["2026-12-02", { date: "2026-12-02", text: "A", themeId: "a" }],
      ["2026-12-03", { date: "2026-12-03", text: "Custom", themeId: null }],
      ["2026-12-06", { date: "2026-12-06", text: null, themeId: null }],
      ["2026-12-09", { date: "2026-12-09", text: "B", themeId: "b" }],
    ]);
    expect([...daysByIdea(saved)]).toEqual([
      ["a", ["2026-12-02", "2026-12-20"]],
      ["b", ["2026-12-09"]],
    ]);
  });
});

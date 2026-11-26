import { CalendarGrid, type CalendarCell, type CalendarMonthView, type PoolIdea } from "@/components/CalendarGrid";
import { DayPanel, DayRounds } from "@/components/DayPanel";
import { ScrollIntoView } from "@/components/ScrollIntoView";
import { calendarMonths, dayFlag, owesOn } from "@/lib/calendar";
import { loadGame, requireMe } from "@/lib/data";
import { dayOutcome } from "@/lib/game";
import { daysByIdea } from "@/lib/themes";
import { isGameDate, seasonDates } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function CalendarPage({ searchParams }: { searchParams: Promise<{ day?: string }> }) {
  const { day } = await searchParams;
  const me = await requireMe();
  const game = await loadGame();
  const dates = seasonDates(game.season);
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";

  const picked = day && isGameDate(day) && dates.includes(day) ? day : null;
  const selected = picked ?? (dates.includes(game.today) ? game.today : null);

  const cellFor = (date: string): CalendarCell => {
    const opened = date <= game.today;
    const outcome = opened ? dayOutcome(date, game.players, game.submissions, game.ratings) : null;
    const owes = outcome ? owesOn(outcome, me.id) : { song: false, ratings: 0 };
    const flag = dayFlag(date, game.today, owes);
    const queued = game.submissions.filter((s) => s.date === date && s.round === 1);
    return {
      date,
      day: String(Number(date.slice(8, 10))),
      theme: game.themes.get(date) ?? null,
      opened,
      isToday: date === game.today,
      beforeJoin: date < me.joined_on,
      flag,
      flagText: flag
        ? [owes.song ? "you still owe a song" : null, owes.ratings ? `${owes.ratings} ratings left` : null]
            .filter(Boolean)
            .join(" and ")
        : null,
      state: !outcome
        ? "future"
        : outcome.winner
          ? "decided"
          : outcome.current.round > 1
            ? "tiebreak"
            : "waiting",
      winner: outcome?.winner ? nameOf(outcome.winner.playerId) : null,
      queued: !opened && queued.some((s) => s.playerId === me.id),
      queuedCount: opened ? 0 : queued.length,
    };
  };

  const months: CalendarMonthView[] = calendarMonths(game.season).map((m) => ({
    label: m.label,
    weeks: m.weeks.map((w) => w.map((d) => (d ? cellFor(d) : null))),
  }));

  const usedDays = daysByIdea(game.dayThemeRows);
  const pool: PoolIdea[] = me.is_admin
    ? game.themePool.map((t) => ({
        id: t.id,
        text: t.text,
        by: game.players.find((p) => p.id === t.submittedBy)?.name ?? "a former player",
        days: usedDays.get(t.id) ?? [],
      }))
    : [];

  const missed = months
    .flatMap((m) => m.weeks.flat())
    .filter((c): c is CalendarCell => c?.flag === "missed").length;

  return (
    <>
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
        <p className="text-sm text-muted-foreground">
          Tap a day to see its theme, queue a song for it, catch up on it, or see who won.
          {missed > 0 ? (
            <strong className="text-destructive">
              {" "}
              {missed} {missed === 1 ? "day is" : "days are"} still waiting on you.
            </strong>
          ) : null}
        </p>
      </div>
      <CalendarGrid months={months} selected={selected} isAdmin={me.is_admin} pool={pool} />
      {selected ? (
        picked ? (
          <ScrollIntoView key={selected}>
            <div className="flex flex-col gap-6">
              <DayPanel game={game} me={me} date={selected} />
              <DayRounds game={game} me={me} date={selected} />
            </div>
          </ScrollIntoView>
        ) : (
          <div className="flex flex-col gap-6">
            <DayPanel game={game} me={me} date={selected} />
            <DayRounds game={game} me={me} date={selected} />
          </div>
        )
      ) : null}
    </>
  );
}

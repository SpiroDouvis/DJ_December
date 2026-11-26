"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { AlertCircle, GripVertical, Hourglass, ListMusic, Sparkles, Swords, Trophy, X } from "lucide-react";
import { assignIdea, clearDayTheme } from "@/app/actions";
import { cn } from "@/lib/utils";

export type CalendarCell = {
  date: string;
  /** Day of the month, "1" to "31". */
  day: string;
  theme: string | null;
  opened: boolean;
  isToday: boolean;
  /** The viewer hadn't joined yet on this day. */
  beforeJoin: boolean;
  /** "missed": a past day the viewer still owes a song or ratings for. "todo": today, same. */
  flag: "missed" | "todo" | null;
  flagText: string | null;
  state: "future" | "waiting" | "tiebreak" | "decided";
  winner: string | null;
  /** The viewer has a song queued for this future day. */
  queued: boolean;
  /** How many players have queued songs here, so an admin knows a new theme drops them. */
  queuedCount: number;
};

export type CalendarMonthView = { label: string; weeks: (CalendarCell | null)[][] };

export type PoolIdea = { id: string; text: string; by: string; days: string[] };

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DRAG_IDEA = "application/x-djd-idea";
const DRAG_DAY = "application/x-djd-day";

type Pending = { date: string; theme: string | null };

export function CalendarGrid({
  months,
  selected,
  isAdmin,
  pool,
}: {
  months: CalendarMonthView[];
  selected: string | null;
  isAdmin: boolean;
  pool: PoolIdea[];
}) {
  const [, startTransition] = useTransition();
  const [message, setMessage] = useState<{ error?: string; ok?: string } | null>(null);
  const [over, setOver] = useState<string | null>(null);
  const [dragging, setDragging] = useState(false);
  const [optimistic, addOptimistic] = useOptimistic<Record<string, string | null>, Pending>(
    {},
    (state, p) => ({ ...state, [p.date]: p.theme }),
  );
  const themeOf = (cell: CalendarCell) => (cell.date in optimistic ? optimistic[cell.date] : cell.theme);
  const cells = months.flatMap((m) => m.weeks.flat()).filter((c): c is CalendarCell => c !== null);

  const run = (pending: Pending, action: () => Promise<{ error?: string; ok?: string } | undefined>) => {
    startTransition(async () => {
      addOptimistic(pending);
      try {
        setMessage((await action()) ?? null);
      } catch {
        setMessage({ error: "That didn't save. Try again." });
      }
    });
  };

  const confirmDrop = (cell: CalendarCell, newTheme: string) =>
    !cell.opened && cell.queuedCount > 0 && themeOf(cell) !== newTheme
      ? window.confirm(
          `${cell.queuedCount} ${cell.queuedCount === 1 ? "player has" : "players have"} a song queued for this day. ` +
            `Giving it a new theme removes ${cell.queuedCount === 1 ? "it" : "them"}. Go ahead?`,
        )
      : true;

  const onDrop = (cell: CalendarCell, e: React.DragEvent) => {
    e.preventDefault();
    setOver(null);
    setDragging(false);
    const ideaId = e.dataTransfer.getData(DRAG_IDEA);
    const fromDay = e.dataTransfer.getData(DRAG_DAY);
    if (ideaId) {
      const idea = pool.find((i) => i.id === ideaId);
      if (!idea || !confirmDrop(cell, idea.text)) return;
      run({ date: cell.date, theme: idea.text }, () => assignIdea(cell.date, ideaId));
    } else if (fromDay && fromDay !== cell.date) {
      // Moving a theme from one day to another.
      const from = cells.find((c) => c.date === fromDay);
      const text = from ? themeOf(from) : null;
      const idea = pool.find((i) => i.text === text);
      if (!from || !text || !idea || !confirmDrop(cell, text)) return;
      run({ date: cell.date, theme: text }, () => assignIdea(cell.date, idea.id));
      run({ date: fromDay, theme: null }, () => clearDayTheme(fromDay));
    }
  };

  return (
    <div className={cn("grid gap-6", isAdmin && "lg:grid-cols-[minmax(0,1fr)_240px]")}>
      <div className="flex min-w-0 flex-col gap-6">
        {months.map((month) => (
          <section key={month.label} className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold tracking-tight">{month.label}</h2>
            <div className="grid grid-cols-7 gap-1 sm:gap-1.5">
              {WEEKDAYS.map((d) => (
                <div key={d} className="pb-1 text-center text-[11px] font-semibold tracking-wider text-violet-300 uppercase">
                  <span className="sm:hidden">{d.slice(0, 1)}</span>
                  <span className="hidden sm:inline">{d}</span>
                </div>
              ))}
              {month.weeks.flat().map((cell, i) =>
                cell ? (
                  <DayCell
                    key={cell.date}
                    cell={cell}
                    theme={themeOf(cell)}
                    selected={cell.date === selected}
                    isAdmin={isAdmin}
                    dropTarget={over === cell.date}
                    dragging={dragging}
                    onDragOver={(e) => {
                      if (!isAdmin) return;
                      e.preventDefault();
                      e.dataTransfer.dropEffect = "copy";
                      setOver(cell.date);
                    }}
                    onDragLeave={() => setOver((o) => (o === cell.date ? null : o))}
                    onDrop={(e) => onDrop(cell, e)}
                    onDragStart={(e) => {
                      e.dataTransfer.setData(DRAG_DAY, cell.date);
                      e.dataTransfer.effectAllowed = "move";
                      setDragging(true);
                    }}
                    onDragEnd={() => setDragging(false)}
                  />
                ) : (
                  <div key={`pad-${i}`} aria-hidden />
                ),
              )}
            </div>
          </section>
        ))}
        <Legend />
        {message?.error ? (
          <p role="alert" className="text-sm text-destructive">
            {message.error}
          </p>
        ) : message?.ok ? (
          <p role="status" className="text-sm text-success">
            {message.ok}
          </p>
        ) : null}
      </div>

      {isAdmin ? (
        <IdeaShelf
          pool={pool}
          dragging={dragging}
          onDragStart={() => setDragging(true)}
          onDragEnd={() => setDragging(false)}
          onClearDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            const fromDay = e.dataTransfer.getData(DRAG_DAY);
            if (fromDay) run({ date: fromDay, theme: null }, () => clearDayTheme(fromDay));
          }}
        />
      ) : null}
    </div>
  );
}

function DayCell({
  cell,
  theme,
  selected,
  isAdmin,
  dropTarget,
  dragging,
  ...drag
}: {
  cell: CalendarCell;
  theme: string | null;
  selected: boolean;
  isAdmin: boolean;
  dropTarget: boolean;
  dragging: boolean;
  onDragOver: (e: React.DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: React.DragEvent) => void;
  onDragStart: (e: React.DragEvent) => void;
  onDragEnd: () => void;
}) {
  const label = [
    cell.date,
    theme ? `theme: ${theme}` : null,
    cell.flagText,
    cell.winner ? `won by ${cell.winner}` : null,
    cell.queued ? "you have a song queued" : null,
  ]
    .filter(Boolean)
    .join(", ");
  return (
    <Link
      href={`/calendar?day=${cell.date}`}
      scroll={false}
      aria-label={label}
      aria-current={selected ? "date" : undefined}
      draggable={isAdmin && !!theme}
      onDragStart={isAdmin && theme ? drag.onDragStart : undefined}
      onDragEnd={drag.onDragEnd}
      onDragOver={drag.onDragOver}
      onDragLeave={drag.onDragLeave}
      onDrop={drag.onDrop}
      className={cn(
        "group relative flex min-h-16 flex-col gap-1 overflow-hidden rounded-lg border bg-card/60 p-1 text-left no-underline transition-all sm:min-h-28 sm:p-2",
        "hover:border-primary/60 hover:bg-accent/40",
        cell.beforeJoin && "opacity-50",
        cell.opened && !cell.isToday && "bg-background/30",
        cell.isToday && "border-primary/70 shadow-[0_0_24px_-10px_var(--primary)]",
        selected && "bg-accent/60 ring-2 ring-primary",
        cell.flag === "missed" && "border-2 border-destructive bg-destructive/10 hover:border-destructive",
        dragging && isAdmin && "border-dashed",
        dropTarget && "scale-[1.03] border-2 border-dashed border-violet-300 bg-primary/25",
      )}
    >
      <span className="flex items-center justify-between gap-1">
        <span
          className={cn(
            "grid size-5 place-items-center rounded-full text-xs font-semibold sm:size-6 sm:text-sm",
            cell.isToday ? "bg-primary text-primary-foreground" : "text-foreground",
          )}
        >
          {cell.day}
        </span>
        {cell.flag === "missed" ? (
          <AlertCircle className="size-4 text-destructive sm:size-5" aria-hidden />
        ) : cell.flag === "todo" ? (
          <span className="size-2 rounded-full bg-warning sm:size-2.5" aria-hidden />
        ) : null}
      </span>

      {theme ? (
        <>
          <Sparkles className="size-3.5 text-violet-300 sm:hidden" aria-hidden />
          <span className="hidden rounded-md bg-primary/20 px-1.5 py-0.5 text-[11px] leading-tight font-medium text-violet-100 sm:line-clamp-2">
            {theme}
          </span>
        </>
      ) : null}

      <span className="mt-auto flex items-center gap-1 text-[11px] text-muted-foreground">
        {cell.state === "decided" ? (
          <>
            <Trophy className="size-3.5 shrink-0 text-gold" aria-hidden />
            <span className="hidden truncate text-gold sm:inline">{cell.winner}</span>
          </>
        ) : cell.state === "tiebreak" ? (
          <>
            <Swords className="size-3.5 shrink-0 text-warning" aria-hidden />
            <span className="hidden sm:inline">Tiebreak</span>
          </>
        ) : cell.state === "waiting" ? (
          <>
            <Hourglass className="size-3.5 shrink-0" aria-hidden />
            <span className="hidden sm:inline">In play</span>
          </>
        ) : cell.queued ? (
          <>
            <ListMusic className="size-3.5 shrink-0 text-success" aria-hidden />
            <span className="hidden text-success sm:inline">Queued</span>
          </>
        ) : null}
      </span>
    </Link>
  );
}

function Legend() {
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
      <li className="flex items-center gap-1.5">
        <span className="grid size-4 place-items-center rounded border-2 border-destructive">
          <AlertCircle className="size-2.5 text-destructive" />
        </span>
        You still owe a song or ratings
      </li>
      <li className="flex items-center gap-1.5">
        <Sparkles className="size-3.5 text-violet-300" /> Theme day
      </li>
      <li className="flex items-center gap-1.5">
        <Trophy className="size-3.5 text-gold" /> Winner decided
      </li>
      <li className="flex items-center gap-1.5">
        <Hourglass className="size-3.5" /> Waiting on songs or ratings
      </li>
      <li className="flex items-center gap-1.5">
        <ListMusic className="size-3.5 text-success" /> You queued a song
      </li>
    </ul>
  );
}

function IdeaShelf({
  pool,
  dragging,
  onDragStart,
  onDragEnd,
  onClearDrop,
}: {
  pool: PoolIdea[];
  dragging: boolean;
  onDragStart: () => void;
  onDragEnd: () => void;
  onClearDrop: (e: React.DragEvent) => void;
}) {
  const unused = pool.filter((i) => i.days.length === 0);
  const used = pool.filter((i) => i.days.length > 0);
  const chip = (idea: PoolIdea) => (
    <li
      key={idea.id}
      draggable
      onDragStart={(e) => {
        e.dataTransfer.setData(DRAG_IDEA, idea.id);
        e.dataTransfer.effectAllowed = "copy";
        onDragStart();
      }}
      onDragEnd={onDragEnd}
      title={`${idea.text}, from ${idea.by}`}
      className="flex cursor-grab items-start gap-1.5 rounded-lg border bg-background/50 px-2 py-1.5 text-sm active:cursor-grabbing hover:border-primary/60"
    >
      <GripVertical className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
      <span className="min-w-0">
        <span className="block leading-snug">{idea.text}</span>
        {idea.days.length > 0 ? (
          <span className="block text-[11px] text-muted-foreground">On {idea.days.map(shortDate).join(", ")}</span>
        ) : null}
      </span>
    </li>
  );

  return (
    <aside
      className="hidden flex-col gap-3 rounded-xl border bg-card p-3 backdrop-blur-md md:flex lg:sticky lg:top-24 lg:max-h-[calc(100vh-8rem)] lg:overflow-y-auto"
      onDragOver={(e) => {
        if (e.dataTransfer.types.includes(DRAG_DAY)) e.preventDefault();
      }}
      onDrop={onClearDrop}
    >
      <div>
        <h2 className="flex items-center gap-1.5 font-semibold">
          <Sparkles className="size-4 text-violet-300" aria-hidden />
          Theme ideas
        </h2>
        <p className="text-xs text-muted-foreground">
          Drag an idea onto a day. Drag a day&apos;s theme to another day to move it, or back here to clear it. On a phone,
          tap a day and pick from the list.
        </p>
      </div>
      {dragging ? (
        <p className="flex items-center gap-1.5 rounded-lg border border-dashed px-2 py-1.5 text-xs text-muted-foreground">
          <X className="size-3.5" aria-hidden /> Drop a day&apos;s theme here to clear it
        </p>
      ) : null}
      {pool.length === 0 ? (
        <p className="text-sm text-muted-foreground">No ideas yet. Players add them on the Ideas page.</p>
      ) : null}
      {unused.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold tracking-wider text-violet-300 uppercase">Not used yet · {unused.length}</h3>
          <ul className="flex flex-col gap-1.5">{unused.map(chip)}</ul>
        </div>
      ) : null}
      {used.length > 0 ? (
        <div className="flex flex-col gap-1.5">
          <h3 className="text-xs font-semibold tracking-wider text-violet-300 uppercase">On the calendar · {used.length}</h3>
          <ul className="flex flex-col gap-1.5">{used.map(chip)}</ul>
        </div>
      ) : null}
    </aside>
  );
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const shortDate = (d: string) => `${MONTHS[Number(d.slice(5, 7)) - 1]} ${Number(d.slice(8, 10))}`;

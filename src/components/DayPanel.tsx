import Link from "next/link";
import { AlertCircle, CalendarDays, Clock, ListMusic, Trash2 } from "lucide-react";
import { removeQueuedSong } from "@/app/actions";
import type { Game, Me } from "@/lib/data";
import { dayHref, owesOn } from "@/lib/calendar";
import { dayOutcome, owedDates } from "@/lib/game";
import { daysByIdea } from "@/lib/themes";
import { formatDate } from "@/lib/time";
import { DayView, roundLabel, ThemeLine } from "./DayView";
import { SongCard } from "./SongCard";
import { SubmitSongForm } from "./SubmitSongForm";
import { ThemePicker } from "./ThemePicker";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";

const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

function owedSentence(missed: boolean, song: boolean, tiebreak: boolean, ratings: number) {
  const todo = [
    song ? `send your ${tiebreak ? "tiebreak " : ""}song` : null,
    ratings ? `rate ${ratings} ${ratings === 1 ? "song" : "songs"}` : null,
  ]
    .filter(Boolean)
    .join(" and ");
  return missed
    ? `You missed this one: ${todo} to finish it. It's not too late.`
    : `${todo.charAt(0).toUpperCase()}${todo.slice(1)} to finish today.`;
}

/** Everything about one calendar day: its theme, what you can do there, and how it went. */
export function DayPanel({ game, me, date }: { game: Game; me: Me; date: string }) {
  const opened = date <= game.today;
  const theme = game.themes.get(date);
  const row = game.dayThemeRows.get(date);
  const outcome = opened ? dayOutcome(date, game.players, game.submissions, game.ratings) : null;
  const owes = outcome ? owesOn(outcome, me.id) : { song: false, ratings: 0 };
  const queuedHere = game.submissions.filter((s) => s.date === date && s.round === 1);
  const mineQueued = !opened ? queuedHere.find((s) => s.playerId === me.id) : undefined;
  const mineQueuedSong = mineQueued ? game.songs.get(mineQueued.songId) : undefined;
  const beforeJoin = date < me.joined_on;
  const used = daysByIdea(game.dayThemeRows);

  let owedFirst: string | undefined;
  if (outcome && owes.song && outcome.current.round === 1) {
    owedFirst = owedDates(me.id, game.open, game.players, game.submissions)[0];
  }

  return (
    <Card className={owes.song || owes.ratings ? (date < game.today ? "border-destructive/70" : "border-warning/50") : ""}>
      <CardHeader>
        <CardTitle className="flex-wrap text-xl">
          <CalendarDays className="size-5 text-violet-300" aria-hidden />
          {weekday(date)}, {formatDate(date)}
          {date === game.today ? <Badge>Today</Badge> : null}
          {!opened ? (
            <Badge variant="secondary">
              <Clock />
              Opens 5 AM MST
            </Badge>
          ) : outcome?.winner ? (
            <Badge variant="gold">Results out</Badge>
          ) : (
            <Badge variant="warning">In play</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {theme ? <ThemeLine theme={theme} /> : <p className="text-sm text-muted-foreground">No theme this day.</p>}

        {me.is_admin ? (
          <ThemePicker
            key={`${date}:${row?.themeId ?? row?.text ?? "none"}`}
            date={date}
            current={row?.text ? (row.themeId ? `idea:${row.themeId}` : "custom") : "none"}
            ideas={game.themePool.map((t) => ({ id: t.id, text: t.text, used: used.has(t.id) }))}
            queuedCount={opened ? 0 : queuedHere.length}
          />
        ) : null}

        {beforeJoin ? (
          <p className="text-sm text-muted-foreground">You start playing on {formatDate(me.joined_on)}.</p>
        ) : !opened ? (
          mineQueuedSong ? (
            <>
              <p className="flex items-center gap-2 text-sm">
                <ListMusic className="size-4 text-success" aria-hidden />
                Your song is queued. It goes in when the day opens.
              </p>
              <div className="max-w-md">
                <SongCard song={mineQueuedSong} service={me.service} label="Queued" />
              </div>
              <details className="rounded-lg border bg-background/30 px-4 py-2 open:pb-4">
                <summary className="cursor-pointer text-sm text-muted-foreground marker:text-violet-300 hover:text-foreground">
                  Swap or remove
                </summary>
                <div className="mt-3 flex flex-col gap-3">
                  <SubmitSongForm key={date} date={date} cta="Swap song" />
                  <form action={removeQueuedSong}>
                    <input type="hidden" name="date" value={date} />
                    <Button type="submit" variant="destructive" size="sm">
                      <Trash2 />
                      Remove
                    </Button>
                  </form>
                </div>
              </details>
            </>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                Queue a song now and it goes in automatically when the day opens. You can swap or remove it until then.
              </p>
              <SubmitSongForm key={date} date={date} cta={`Queue for ${formatDate(date)}`} />
            </>
          )
        ) : null}

        {outcome && (owes.song || owes.ratings > 0) ? (
          <div
            className={
              date < game.today
                ? "flex gap-2 rounded-lg border border-destructive/50 bg-destructive/10 px-3 py-2 text-sm"
                : "flex gap-2 rounded-lg border border-warning/40 bg-warning/10 px-3 py-2 text-sm"
            }
          >
            <AlertCircle
              className={date < game.today ? "mt-0.5 size-4 shrink-0 text-destructive" : "mt-0.5 size-4 shrink-0 text-warning"}
              aria-hidden
            />
            <span>{owedSentence(date < game.today, owes.song, outcome.current.round > 1, owes.ratings)}</span>
          </div>
        ) : null}

        {outcome && owes.song ? (
          outcome.current.round > 1 ? (
            <SubmitSongForm
              key={`${date}:${outcome.current.round}`}
              date={date}
              round={outcome.current.round}
              cta={`Send ${roundLabel(outcome.current.round).toLowerCase()} song`}
            />
          ) : owedFirst && owedFirst !== date ? (
            <p className="text-sm">
              Songs go in oldest first, so{" "}
              <Link href={dayHref(owedFirst)} scroll={false} className="text-violet-200 underline hover:text-white">
                send your song for {formatDate(owedFirst)}
              </Link>{" "}
              before this one.
            </p>
          ) : (
            <SubmitSongForm key={date} date={date} cta={`Send for ${formatDate(date)}`} />
          )
        ) : null}
      </CardContent>
    </Card>
  );
}

/** The rounds of an opened day (rating forms or results), shown under the panel. */
export function DayRounds({ game, me, date }: { game: Game; me: Me; date: string }) {
  if (date > game.today) return null;
  return <DayView game={game} me={me} date={date} />;
}

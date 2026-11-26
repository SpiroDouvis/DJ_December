import Link from "next/link";
import { OpenRound, roundLabel, ThemeLine } from "@/components/DayView";
import { SongCard } from "@/components/SongCard";
import { SubmitSongForm } from "@/components/SubmitSongForm";
import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlarmClock, ChevronRight, Disc3, ListMusic, PartyPopper, Swords, Trophy } from "lucide-react";
import { dayHref } from "@/lib/calendar";
import { loadGame, requireMe } from "@/lib/data";
import { dayOutcome, owedDates, owedTiebreaks } from "@/lib/game";
import { formatDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireMe();
  const game = await loadGame();
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";

  if (game.open.length === 0) {
    return (
      <Card className="glow">
        <CardHeader>
          <CardTitle className="text-2xl">
            <PartyPopper className="size-6 text-violet-300" aria-hidden />
            Get ready
          </CardTitle>
          <CardDescription className="text-base">
            DJ December starts <strong className="text-foreground">{formatDate(game.season.start)}</strong> at 5 AM
            MST. Each day, send one song and rate everyone else&apos;s.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You can already check the themes and queue songs on the{" "}
            <Link href="/calendar" className="text-violet-200 underline hover:text-white">
              calendar
            </Link>
            , and{" "}
            <Link href="/ideas" className="text-violet-200 underline hover:text-white">
              add theme ideas
            </Link>{" "}
            for the theme days.
          </p>
        </CardContent>
      </Card>
    );
  }

  const owed = owedDates(me.id, game.open, game.players, game.submissions);
  const todays = game.submissions.find(
    (s) => s.playerId === me.id && s.date === game.today && s.round === 1,
  );
  const todaysSong = todays ? game.songs.get(todays.songId) : undefined;
  const todaysRated = todays ? game.ratings.some((r) => r.submissionId === todays.id) : false;

  const queuedCount = game.submissions.filter((s) => s.playerId === me.id && s.date > game.today).length;
  const outcomes = game.open.map((d) => dayOutcome(d, game.players, game.submissions, game.ratings));
  const tiebreaks = owedTiebreaks(me.id, outcomes);
  const pending = outcomes.filter((o) => !o.current.revealed).reverse();
  const decided = outcomes.filter((o) => o.winner).reverse();

  return (
    <>
      {tiebreaks.map((t) => (
        <Card className="border-warning/50 shadow-[0_10px_40px_-14px_var(--warning)]" key={`${t.date}-${t.round}`}>
          <CardHeader>
            <CardTitle>
              <Swords className="size-5 text-warning" aria-hidden />
              {formatDate(t.date)} {roundLabel(t.round).toLowerCase()}!
            </CardTitle>
            <CardDescription>You tied for the top. Send another song to settle it.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <ThemeLine theme={game.themes.get(t.date)} />
            <SubmitSongForm date={t.date} round={t.round} cta="Send tiebreak song" />
          </CardContent>
        </Card>
      ))}

      <Card className="glow">
        <CardHeader>
          <CardTitle className="text-xl">
            <Disc3 className="size-5 text-violet-300" aria-hidden />
            Your song
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
        {owed.length > 0 ? (
          <>
            {owed[0] < game.today ? (
              <p className="flex items-start gap-2 rounded-lg border border-warning/30 bg-warning/10 px-3 py-2 font-medium text-warning">
                <AlarmClock className="mt-0.5 size-4 shrink-0" aria-hidden />
                <span>
                  You&apos;re behind! You still owe {owed.length === 1 ? "a song" : `${owed.length} songs`} (
                  {owed.map(formatDate).join(", ")}). Start with {formatDate(owed[0])}.
                </span>
              </p>
            ) : (
              <p>Send your song for today, {formatDate(owed[0])}.</p>
            )}
            <ThemeLine theme={game.themes.get(owed[0])} />
            <SubmitSongForm key={owed[0]} date={owed[0]} cta={`Send for ${formatDate(owed[0])}`} />
          </>
        ) : todays && todaysSong ? (
          <>
            <p className="flex items-center gap-2">
              <Badge variant="success">All caught up</Badge>
              <span className="text-muted-foreground">Your song for today:</span>
            </p>
            <div className="max-w-md">
              <SongCard song={todaysSong} service={me.service} label="Your song" />
            </div>
            {!todaysRated ? (
              <details className="group rounded-lg border bg-background/30 px-4 py-2 open:pb-4">
                <summary className="cursor-pointer text-sm text-muted-foreground marker:text-violet-300 hover:text-foreground">
                  Change it (only until someone rates it)
                </summary>
                <div className="mt-3">
                  <SubmitSongForm date={game.today} cta="Swap song" />
                </div>
              </details>
            ) : null}
          </>
        ) : (
          <p>
            <Badge variant="success">All caught up</Badge>
          </p>
        )}
        <p className="flex flex-wrap items-center gap-1.5 text-sm text-muted-foreground">
          <ListMusic className="size-4" aria-hidden />
          {queuedCount > 0
            ? `You have ${queuedCount} ${queuedCount === 1 ? "song" : "songs"} queued for later days. `
            : ""}
          <Link href="/calendar" className="text-violet-200 underline hover:text-white">
            Queue songs ahead
          </Link>{" "}
          from the calendar.
        </p>
        </CardContent>
      </Card>

      <h2 className="mt-2 text-2xl font-bold tracking-tight">To rate</h2>
      {pending.length === 0 ? (
        <p className="text-muted-foreground">Every day so far has its results out.</p>
      ) : null}
      {pending.map((o) => (
        <OpenRound key={o.date} game={game} me={me} status={o.current} />
      ))}

      {decided.length > 0 ? (
        <section className="flex flex-col gap-3">
          <h2 className="mt-2 text-2xl font-bold tracking-tight">Results</h2>
          <Stagger className="grid gap-2">
            {decided.map((o) => (
              <StaggerItem key={o.date}>
                <Link
                  href={dayHref(o.date)}
                  className="group flex items-center gap-3 rounded-xl border bg-card px-4 py-3 no-underline backdrop-blur-md transition-all hover:border-primary/50 hover:bg-accent/40"
                >
                  <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold/15 text-gold">
                    <Trophy className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-xs font-medium text-muted-foreground">{formatDate(o.date)}</span>
                    <span className="block truncate">
                      <strong>{nameOf(o.winner!.playerId)}</strong> won with &quot;
                      {game.songs.get(o.winner!.songId)?.title}&quot;
                    </span>
                  </span>
                  {o.rounds.length > 1 ? <Badge variant="warning">Tiebreak</Badge> : null}
                  <ChevronRight className="size-4 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
                </Link>
              </StaggerItem>
            ))}
          </Stagger>
        </section>
      ) : null}
    </>
  );
}

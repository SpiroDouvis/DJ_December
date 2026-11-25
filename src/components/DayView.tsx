import Link from "next/link";
import type { Game, Me } from "@/lib/data";
import { dayOutcome, shuffledForDisplay, type DayOutcome, type RoundStatus } from "@/lib/game";
import { availabilityKey } from "@/lib/schedule";
import { formatDate } from "@/lib/time";
import { Hourglass, Trophy } from "lucide-react";
import { ResultBanner, RevealRow, RevealRows, Stagger, StaggerItem, ThemeReveal } from "./motion";
import { RatingForm } from "./RatingForm";
import { SongCard } from "./SongCard";
import { WinConfetti } from "./WinConfetti";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableHead, TableHeader, TableRow } from "./ui/table";

const names = (list: string[]) =>
  list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;

export const roundLabel = (round: number) =>
  round === 1 ? "" : round === 2 ? "Tiebreak" : `Tiebreak ${round - 1}`;

const title = (status: RoundStatus) =>
  [formatDate(status.date), roundLabel(status.round)].filter(Boolean).join(" · ");

export function ThemeLine({ theme }: { theme?: string }) {
  return theme ? (
    <div>
      <ThemeReveal theme={theme} />
    </div>
  ) : null;
}

/** Who the round is waiting on. Public on purpose: slacking should be seen. */
export function WaitingOn({ status, game }: { status: RoundStatus; game: Game }) {
  if (status.revealed) return null;
  // What each player said about today on the schedule tab, if anything.
  const today = (id: string) => {
    const a = game.availability.get(availabilityKey(id, game.today));
    if (!a) return "";
    return `${a.status === "busy" ? "busy today" : "free today"}${a.note ? `: ${a.note}` : ""}`;
  };
  const songs = status.missingSongs.map((p) => (today(p.id) ? `${p.name} (${today(p.id)})` : p.name));
  const raters = status.ratingsLeft.map(
    (x) =>
      `${x.player.name} (${[`${x.count} ${x.count === 1 ? "rating" : "ratings"}`, today(x.player.id)]
        .filter(Boolean)
        .join(", ")})`,
  );
  return (
    <div className="flex gap-3 rounded-lg border border-warning/30 bg-warning/5 px-4 py-3 text-sm">
      <Hourglass className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="grid gap-0.5">
        <strong className="text-warning">Waiting on</strong>
        {songs.length ? <p>No song yet: {names(songs)}</p> : null}
        {raters.length ? <p>Still rating: {names(raters)}</p> : null}
      </div>
    </div>
  );
}

/** A round that hasn't been revealed: anonymous songs, your ratings, and who's holding it up. */
export function OpenRound({ game, me, status }: { game: Game; me: Me; status: RoundStatus }) {
  const rates = status.raters.some((p) => p.id === me.id);
  const mine = status.submissions.find((s) => s.playerId === me.id);
  const others = shuffledForDisplay(status.submissions.filter((s) => s.playerId !== me.id));
  const myScore = (submissionId: string) =>
    game.ratings.find((r) => r.submissionId === submissionId && r.raterId === me.id)?.score;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Link href={`/day/${status.date}`} className="no-underline hover:text-violet-200">
            {title(status)}
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
      <ThemeLine theme={game.themes.get(status.date)} />
      {status.round > 1 ? (
        <p className="text-sm text-muted-foreground">
          {status.raters.every((r) => status.submitters.some((s) => s.id === r.id))
            ? "Everyone tied, so everyone sends another song and rates the rest."
            : `${names(status.submitters.map((p) => p.name))} tied. They each send another song, and ${names(
                status.raters.map((p) => p.name),
              )} ${status.raters.length === 1 ? "rates" : "rate"} them.`}
        </p>
      ) : null}
      <WaitingOn status={status} game={game} />
      {others.length === 0 ? <p className="text-sm text-muted-foreground">No songs to rate yet.</p> : null}
      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {others.map((s, i) => {
          const song = game.songs.get(s.songId);
          if (!song) return null;
          return (
            <StaggerItem key={s.id}>
              <SongCard song={song} service={me.service} label={`Song ${i + 1}`}>
                {rates ? <RatingForm submissionId={s.id} current={myScore(s.id)} /> : null}
              </SongCard>
            </StaggerItem>
          );
        })}
        {mine && game.songs.get(mine.songId) ? (
          <StaggerItem>
            <SongCard song={game.songs.get(mine.songId)!} service={me.service} label="Your song" />
          </StaggerItem>
        ) : null}
      </Stagger>
      </CardContent>
    </Card>
  );
}

/** A revealed round: every score, who gave what to whom, and how it ended. */
export function RoundResults({
  game,
  me,
  status,
  outcome,
}: {
  game: Game;
  me: Me;
  status: RoundStatus;
  outcome: DayOutcome;
}) {
  const results = status.results ?? [];
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";
  const score = (raterId: string, submissionId: string) =>
    game.ratings.find((r) => r.raterId === raterId && r.submissionId === submissionId)?.score;
  const tie = status.leaders.length > 1;
  const isWinningRound = outcome.winner !== null && outcome.current === status;

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          <Trophy className="size-5 text-gold" aria-hidden />
          {title(status)} results
        </CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
      <ThemeLine theme={game.themes.get(status.date)} />
      {tie ? (
        <ResultBanner kind="tie">
          Tie between {names(status.leaders.map((s) => nameOf(s.playerId)))}. On to a tiebreak!
        </ResultBanner>
      ) : isWinningRound ? (
        <>
          <ResultBanner kind="win">
            {nameOf(status.leaders[0].playerId)} wins {formatDate(status.date)}
            {status.round > 1 ? " in the tiebreak" : ""}!
          </ResultBanner>
          <WinConfetti id={`${status.date}:${status.leaders[0].id}`} />
        </>
      ) : null}

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Rank</TableHead>
            <TableHead>Song</TableHead>
            <TableHead>Sent by</TableHead>
            {status.raters.map((p) => (
              <TableHead key={p.id}>{p.name}</TableHead>
            ))}
            <TableHead>Total</TableHead>
          </TableRow>
        </TableHeader>
        <RevealRows>
          {results.map((r) => {
            const song = game.songs.get(r.submission.songId);
            return (
              <RevealRow key={r.submission.id} winner={r.rank === 1}>
                <td className="px-3 py-2.5">
                  {r.rank === 1 ? (
                    <span className="inline-flex items-center gap-1 font-semibold text-gold">
                      <Trophy className="size-3.5" />1
                    </span>
                  ) : (
                    <span className="text-muted-foreground">{r.rank}</span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {song?.title}
                  <span className="text-muted-foreground"> {song?.artist}</span>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{nameOf(r.submission.playerId)}</td>
                {status.raters.map((p) => (
                  <td key={p.id} className="px-3 py-2.5 font-mono tabular-nums">
                    {p.id === r.submission.playerId ? (
                      <span className="text-muted-foreground">—</span>
                    ) : (
                      score(p.id, r.submission.id)?.toFixed(1)
                    )}
                  </td>
                ))}
                <td className="px-3 py-2.5 font-mono font-bold tabular-nums text-violet-200">{r.total.toFixed(1)}</td>
              </RevealRow>
            );
          })}
        </RevealRows>
      </Table>
      <CardDescription>Columns show the rating each player gave.</CardDescription>

      <Stagger className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {results.map((r) => {
          const song = game.songs.get(r.submission.songId);
          return song ? (
            <StaggerItem key={r.submission.id}>
              <SongCard
                song={song}
                service={me.service}
                highlight={r.rank === 1 && isWinningRound}
                label={`#${r.rank} · ${nameOf(r.submission.playerId)}`}
              />
            </StaggerItem>
          ) : null;
        })}
      </Stagger>
      </CardContent>
    </Card>
  );
}

/** Every round of a day: the round still in play first, then results newest first. */
export function DayView({ game, me, date }: { game: Game; me: Me; date: string }) {
  const outcome = dayOutcome(date, game.players, game.submissions, game.ratings);
  return (
    <>
      {[...outcome.rounds].reverse().map((status) =>
        status.revealed ? (
          <RoundResults key={status.round} game={game} me={me} status={status} outcome={outcome} />
        ) : (
          <OpenRound key={status.round} game={game} me={me} status={status} />
        ),
      )}
    </>
  );
}

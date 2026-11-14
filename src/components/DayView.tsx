import Link from "next/link";
import type { Game, Me } from "@/lib/data";
import { dayOutcome, shuffledForDisplay, type DayOutcome, type RoundStatus } from "@/lib/game";
import { formatDate } from "@/lib/time";
import { RatingForm } from "./RatingForm";
import { SongCard } from "./SongCard";

const names = (list: string[]) =>
  list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;

export const roundLabel = (round: number) =>
  round === 1 ? "" : round === 2 ? "Tiebreak" : `Tiebreak ${round - 1}`;

const title = (status: RoundStatus) =>
  [formatDate(status.date), roundLabel(status.round)].filter(Boolean).join(" · ");

/** Who the round is waiting on. Public on purpose: slacking should be seen. */
export function WaitingOn({ status }: { status: RoundStatus }) {
  if (status.revealed) return null;
  const songs = status.missingSongs.map((p) => p.name);
  const raters = status.ratingsLeft.map(
    (x) => `${x.player.name} (${x.count} ${x.count === 1 ? "rating" : "ratings"})`,
  );
  return (
    <div className="waiting">
      <strong>Waiting on</strong>
      {songs.length ? <p>No song yet: {names(songs)}</p> : null}
      {raters.length ? <p>Still rating: {names(raters)}</p> : null}
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
    <section className="day">
      <h3>
        <Link href={`/day/${status.date}`}>{title(status)}</Link>
      </h3>
      {status.round > 1 ? (
        <p className="muted">
          {status.raters.every((r) => status.submitters.some((s) => s.id === r.id))
            ? "Everyone tied, so everyone sends another song and rates the rest."
            : `${names(status.submitters.map((p) => p.name))} tied. They each send another song, and ${names(
                status.raters.map((p) => p.name),
              )} ${status.raters.length === 1 ? "rates" : "rate"} them.`}
        </p>
      ) : null}
      <WaitingOn status={status} />
      {others.length === 0 ? <p className="muted">No songs to rate yet.</p> : null}
      <div className="songs">
        {others.map((s, i) => {
          const song = game.songs.get(s.songId);
          if (!song) return null;
          return (
            <SongCard key={s.id} song={song} service={me.service} label={`Song ${i + 1}`}>
              {rates ? <RatingForm submissionId={s.id} current={myScore(s.id)} /> : null}
            </SongCard>
          );
        })}
        {mine && game.songs.get(mine.songId) ? (
          <SongCard song={game.songs.get(mine.songId)!} service={me.service} label="Your song" />
        ) : null}
      </div>
    </section>
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
    <section className="day">
      <h3>{title(status)} results</h3>
      {tie ? (
        <p className="banner tie">
          Tie between {names(status.leaders.map((s) => nameOf(s.playerId)))}. On to a tiebreak!
        </p>
      ) : isWinningRound ? (
        <p className="banner">
          {nameOf(status.leaders[0].playerId)} wins {formatDate(status.date)}
          {status.round > 1 ? " in the tiebreak" : ""}!
        </p>
      ) : null}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Song</th>
              <th>Sent by</th>
              {status.raters.map((p) => (
                <th key={p.id}>{p.name}</th>
              ))}
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            {results.map((r) => {
              const song = game.songs.get(r.submission.songId);
              return (
                <tr key={r.submission.id} className={r.rank === 1 ? "winner" : undefined}>
                  <td>{r.rank}</td>
                  <td>
                    {song?.title}
                    <span className="muted"> {song?.artist}</span>
                  </td>
                  <td>{nameOf(r.submission.playerId)}</td>
                  {status.raters.map((p) => (
                    <td key={p.id}>
                      {p.id === r.submission.playerId ? "—" : score(p.id, r.submission.id)?.toFixed(1)}
                    </td>
                  ))}
                  <td>
                    <strong>{r.total.toFixed(1)}</strong>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="muted">Columns show the rating each player gave.</p>

      <div className="songs">
        {results.map((r) => {
          const song = game.songs.get(r.submission.songId);
          return song ? (
            <SongCard
              key={r.submission.id}
              song={song}
              service={me.service}
              label={`#${r.rank} · ${nameOf(r.submission.playerId)}`}
            />
          ) : null;
        })}
      </div>
    </section>
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

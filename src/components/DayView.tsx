import Link from "next/link";
import type { Game, Me } from "@/lib/data";
import { dayStatus, shuffledForDisplay, type DayStatus } from "@/lib/game";
import { formatDate, type GameDate } from "@/lib/time";
import { RatingForm } from "./RatingForm";
import { SongCard } from "./SongCard";

const names = (list: string[]) =>
  list.length <= 1 ? list.join("") : `${list.slice(0, -1).join(", ")} and ${list.at(-1)}`;

/** Who the day is waiting on. Public on purpose: slacking should be seen. */
export function WaitingOn({ status }: { status: DayStatus }) {
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

/** A day that hasn't been revealed: anonymous songs, your ratings, and who's holding it up. */
export function OpenDay({ game, me, date }: { game: Game; me: Me; date: GameDate }) {
  const status = dayStatus(date, game.players, game.submissions, game.ratings);
  const inDay = status.players.some((p) => p.id === me.id);
  const mine = status.submissions.find((s) => s.playerId === me.id);
  const others = shuffledForDisplay(status.submissions.filter((s) => s.playerId !== me.id));
  const myScore = (submissionId: string) =>
    game.ratings.find((r) => r.submissionId === submissionId && r.raterId === me.id)?.score;

  return (
    <section className="day">
      <h3>
        <Link href={`/day/${date}`}>{formatDate(date)}</Link>
      </h3>
      <WaitingOn status={status} />
      {others.length === 0 ? <p className="muted">No songs to rate yet.</p> : null}
      <div className="songs">
        {others.map((s, i) => {
          const song = game.songs.get(s.songId);
          if (!song) return null;
          return (
            <SongCard key={s.id} song={song} service={me.service} label={`Song ${i + 1}`}>
              {inDay ? <RatingForm submissionId={s.id} current={myScore(s.id)} /> : null}
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

/** A revealed day: every score, who gave what to whom, and the winner. */
export function RevealedDay({ game, me, date }: { game: Game; me: Me; date: GameDate }) {
  const status = dayStatus(date, game.players, game.submissions, game.ratings);
  const results = status.results ?? [];
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";
  const score = (raterId: string, submissionId: string) =>
    game.ratings.find((r) => r.raterId === raterId && r.submissionId === submissionId)?.score;
  const tie = status.leaders.length > 1;

  return (
    <section className="day">
      <h3>{formatDate(date)} results</h3>
      {tie ? (
        <p className="banner">
          Tie between {names(status.leaders.map((s) => nameOf(s.playerId)))}. Tiebreak rounds are coming in a
          later update.
        </p>
      ) : (
        <p className="banner">{nameOf(status.leaders[0].playerId)} wins {formatDate(date)}!</p>
      )}

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th>Song</th>
              <th>Sent by</th>
              {status.players.map((p) => (
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
                  {status.players.map((p) => (
                    <td key={p.id}>{p.id === r.submission.playerId ? "—" : score(p.id, r.submission.id)?.toFixed(1)}</td>
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
            <SongCard key={r.submission.id} song={song} service={me.service} label={`#${r.rank} · ${nameOf(r.submission.playerId)}`} />
          ) : null;
        })}
      </div>
    </section>
  );
}

import Link from "next/link";
import { OpenDay } from "@/components/DayView";
import { SongCard } from "@/components/SongCard";
import { SubmitSongForm } from "@/components/SubmitSongForm";
import { loadGame, requireMe } from "@/lib/data";
import { dayStatus, owedDates } from "@/lib/game";
import { formatDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function Home() {
  const me = await requireMe();
  const game = await loadGame();
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";

  if (game.open.length === 0) {
    return (
      <section className="card">
        <h2>Get ready</h2>
        <p>
          DJ December starts {formatDate(game.season.start)} at 5 AM MST. Each day, send one song and rate
          everyone else&apos;s.
        </p>
      </section>
    );
  }

  const owed = owedDates(me.id, game.open, game.players, game.submissions);
  const todays = game.submissions.find((s) => s.playerId === me.id && s.date === game.today);
  const todaysSong = todays ? game.songs.get(todays.songId) : undefined;
  const todaysRated = todays ? game.ratings.some((r) => r.submissionId === todays.id) : false;

  const statuses = game.open.map((d) => dayStatus(d, game.players, game.submissions, game.ratings));
  const pending = statuses.filter((s) => !s.revealed).reverse();
  const revealed = statuses.filter((s) => s.revealed).reverse();

  return (
    <>
      <section className="card">
        <h2>Your song</h2>
        {owed.length > 0 ? (
          <>
            {owed[0] < game.today ? (
              <p className="late">
                You&apos;re behind! You still owe {owed.length === 1 ? "a song" : `${owed.length} songs`} (
                {owed.map(formatDate).join(", ")}). Start with {formatDate(owed[0])}.
              </p>
            ) : (
              <p>Send your song for today, {formatDate(owed[0])}.</p>
            )}
            <SubmitSongForm key={owed[0]} date={owed[0]} cta={`Send for ${formatDate(owed[0])}`} />
          </>
        ) : todays && todaysSong ? (
          <>
            <p>You&apos;re all caught up. Your song for today:</p>
            <SongCard song={todaysSong} service={me.service} label="Your song" />
            {!todaysRated ? (
              <details>
                <summary>Change it (only until someone rates it)</summary>
                <SubmitSongForm date={game.today} cta="Swap song" />
              </details>
            ) : null}
          </>
        ) : (
          <p>You&apos;re all caught up.</p>
        )}
      </section>

      <h2>To rate</h2>
      {pending.length === 0 ? <p className="muted">Every day so far has its results out.</p> : null}
      {pending.map((s) => (
        <OpenDay key={s.date} game={game} me={me} date={s.date} />
      ))}

      {revealed.length > 0 ? (
        <section>
          <h2>Results</h2>
          <ul className="results">
            {revealed.map((s) => (
              <li key={s.date}>
                <Link href={`/day/${s.date}`}>{formatDate(s.date)}</Link>:{" "}
                {s.leaders.length > 1
                  ? `tie between ${s.leaders.map((l) => nameOf(l.playerId)).join(" and ")}`
                  : `${nameOf(s.leaders[0].playerId)} won with "${game.songs.get(s.leaders[0].songId)?.title}"`}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

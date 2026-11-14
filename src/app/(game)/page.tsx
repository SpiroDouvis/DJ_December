import Link from "next/link";
import { OpenRound, roundLabel } from "@/components/DayView";
import { SongCard } from "@/components/SongCard";
import { SubmitSongForm } from "@/components/SubmitSongForm";
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
  const todays = game.submissions.find(
    (s) => s.playerId === me.id && s.date === game.today && s.round === 1,
  );
  const todaysSong = todays ? game.songs.get(todays.songId) : undefined;
  const todaysRated = todays ? game.ratings.some((r) => r.submissionId === todays.id) : false;

  const outcomes = game.open.map((d) => dayOutcome(d, game.players, game.submissions, game.ratings));
  const tiebreaks = owedTiebreaks(me.id, outcomes);
  const pending = outcomes.filter((o) => !o.current.revealed).reverse();
  const decided = outcomes.filter((o) => o.winner).reverse();

  return (
    <>
      {tiebreaks.map((t) => (
        <section className="card tiebreak" key={`${t.date}-${t.round}`}>
          <h2>
            {formatDate(t.date)} {roundLabel(t.round).toLowerCase()}!
          </h2>
          <p>You tied for the top. Send another song to settle it.</p>
          <SubmitSongForm date={t.date} round={t.round} cta="Send tiebreak song" />
        </section>
      ))}

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
      {pending.map((o) => (
        <OpenRound key={o.date} game={game} me={me} status={o.current} />
      ))}

      {decided.length > 0 ? (
        <section>
          <h2>Results</h2>
          <ul className="results">
            {decided.map((o) => (
              <li key={o.date}>
                <Link href={`/day/${o.date}`}>{formatDate(o.date)}</Link>: {nameOf(o.winner!.playerId)} won with
                &quot;{game.songs.get(o.winner!.songId)?.title}&quot;
                {o.rounds.length > 1 ? " after a tiebreak" : ""}
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </>
  );
}

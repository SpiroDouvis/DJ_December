import type { Game } from "@/lib/data";
import { dayOutcome } from "@/lib/game";
import { computeStats } from "@/lib/stats";

const fmt = (n: number | null) => (n === null ? "—" : n.toFixed(1));

export function StatsView({ game }: { game: Game }) {
  const outcomes = game.open.map((d) => dayOutcome(d, game.players, game.submissions, game.ratings));
  const stats = computeStats(game.players, outcomes, game.ratings);
  const people = stats.players.map((s) => s.player);

  return (
    <>
      <section className="card">
        <h2>Standings</h2>
        <p className="muted">
          From {stats.revealedDays} revealed {stats.revealedDays === 1 ? "day" : "days"}. Days still waiting on
          songs or ratings don&apos;t count yet.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Player</th>
                <th>Wins</th>
                <th>Songs</th>
                <th>Points received</th>
                <th>Avg rating received</th>
                <th>Ratings given</th>
                <th>Avg rating given</th>
              </tr>
            </thead>
            <tbody>
              {stats.players.map((s, i) => (
                <tr key={s.player.id} className={i === 0 && s.wins > 0 ? "winner" : undefined}>
                  <td>{s.player.name}</td>
                  <td>
                    <strong>{s.wins}</strong>
                  </td>
                  <td>{s.songs}</td>
                  <td>{s.pointsReceived.toFixed(1)}</td>
                  <td>{fmt(s.avgReceived)}</td>
                  <td>{s.ratingsGiven}</td>
                  <td>{fmt(s.avgGiven)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Who rates whom</h2>
        <p className="muted">
          Each row is a rater, each column the player whose songs they rated. Cells show the average rating given,
          with the number of ratings in brackets.
        </p>
        <div className="table-wrap">
          <table className="grid">
            <thead>
              <tr>
                <th>Rater ↓ / Song by →</th>
                {people.map((p) => (
                  <th key={p.id}>{p.name}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {people.map((rater) => (
                <tr key={rater.id}>
                  <th>{rater.name}</th>
                  {people.map((target) => {
                    if (rater.id === target.id) return <td key={target.id} className="muted">—</td>;
                    const cell = stats.pairs.get(rater.id)?.get(target.id);
                    return (
                      <td key={target.id}>
                        {cell ? (
                          <>
                            {cell.avg.toFixed(1)} <span className="muted">({cell.count})</span>
                          </>
                        ) : (
                          <span className="muted">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card">
        <h2>Biggest fans and toughest critics</h2>
        <ul className="fans">
          {stats.players.map((s) => (
            <li key={s.player.id}>
              <strong>{s.player.name}</strong>{" "}
              {s.favourite && s.toughest ? (
                <>
                  rates {s.favourite.player.name} highest ({s.favourite.avg.toFixed(1)}) and{" "}
                  {s.toughest.player.name} lowest ({s.toughest.avg.toFixed(1)}).
                </>
              ) : (
                <span className="muted">needs a couple more revealed days to tell.</span>
              )}
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

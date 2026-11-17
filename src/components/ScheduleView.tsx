import { removeQueuedSong, setAvailability } from "@/app/actions";
import { SongCard } from "./SongCard";
import { SubmitSongForm } from "./SubmitSongForm";
import type { Game, Me } from "@/lib/data";
import { availabilityKey, queueBlocker } from "@/lib/schedule";
import { isThemed } from "@/lib/themes";
import { formatDate, seasonDates } from "@/lib/time";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

export function ScheduleView({ game, me }: { game: Game; me: Me }) {
  const upcoming = seasonDates(game.season).filter((d) => d > game.today && d >= me.joined_on);
  const fromToday = seasonDates(game.season).filter((d) => d >= game.today);

  return (
    <>
      <section className="card">
        <h2>Queue songs</h2>
        <p className="muted">
          Pick songs ahead for days without a theme. Each one goes in automatically when its day opens at 5 AM MST,
          and you can swap or remove it until then. Theme days stay secret until the morning, so they can&apos;t be
          queued. If an admin later gives a day a theme, any songs queued for it are dropped.
        </p>
        {upcoming.length === 0 ? <p className="muted">No upcoming days left this season.</p> : null}
        <div className="queue">
          {upcoming.map((date) => {
            const queued = game.submissions.find(
              (s) => s.playerId === me.id && s.date === date && s.round === 1,
            );
            const song = queued ? game.songs.get(queued.songId) : undefined;
            const blocker = queueBlocker(date, game.today, game.season, me.joined_on, game.dayThemeRows);
            return (
              <div key={date} className="queue-row">
                <div className="queue-date">
                  <strong>{formatDate(date)}</strong>
                  <span className="muted">{weekday(date)}</span>
                </div>
                <div className="queue-body">
                  {isThemed(game.season, date, game.dayThemeRows) ? (
                    <p className="muted">Theme day: revealed at 5 AM.</p>
                  ) : song ? (
                    <>
                      <SongCard song={song} service={me.service} label="Queued" />
                      <details>
                        <summary>Swap or remove</summary>
                        <SubmitSongForm date={date} cta="Swap song" />
                        <form action={removeQueuedSong}>
                          <input type="hidden" name="date" value={date} />
                          <button type="submit" className="small danger">
                            Remove
                          </button>
                        </form>
                      </details>
                    </>
                  ) : blocker ? (
                    <p className="muted">{blocker}</p>
                  ) : (
                    <SubmitSongForm date={date} cta="Queue" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <h2>When you can rate</h2>
        <p className="muted">
          Let everyone know when you&apos;re free or busy to listen and rate. It shows next to your name when a day is
          waiting on you.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>You</th>
                {game.players
                  .filter((p) => p.id !== me.id)
                  .map((p) => (
                    <th key={p.id}>{p.name}</th>
                  ))}
              </tr>
            </thead>
            <tbody>
              {fromToday.map((date) => {
                const mine = game.availability.get(availabilityKey(me.id, date));
                return (
                  <tr key={date}>
                    <td>
                      {formatDate(date)} <span className="muted">{weekday(date)}</span>
                    </td>
                    <td>
                      <form action={setAvailability} className="inline">
                        <input type="hidden" name="date" value={date} />
                        <select name="status" defaultValue={mine?.status ?? ""} aria-label={`Your availability on ${formatDate(date)}`}>
                          <option value="">Not set</option>
                          <option value="available">Free</option>
                          <option value="busy">Busy</option>
                        </select>
                        <input name="note" maxLength={60} defaultValue={mine?.note ?? ""} placeholder="e.g. after 8pm" aria-label="Note" />
                        <button type="submit" className="small">
                          Save
                        </button>
                      </form>
                    </td>
                    {game.players
                      .filter((p) => p.id !== me.id)
                      .map((p) => {
                        const a = game.availability.get(availabilityKey(p.id, date));
                        return (
                          <td key={p.id} className={a ? `avail ${a.status}` : "muted"}>
                            {a ? (a.status === "available" ? "Free" : "Busy") : "—"}
                            {a?.note ? <span className="muted"> · {a.note}</span> : null}
                          </td>
                        );
                      })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>
    </>
  );
}

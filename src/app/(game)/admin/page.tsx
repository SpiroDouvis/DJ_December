import { removePlayer, removeTheme, setAdmin, setDayTheme } from "@/app/actions";
import { AddThemeForm } from "@/components/AddThemeForm";
import { AddPlayerForm } from "@/components/AddPlayerForm";
import { loadGame, requireAdmin } from "@/lib/data";
import { isDefaultThemed } from "@/lib/themes";
import { formatDate, seasonDates } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireAdmin();
  const game = await loadGame();
  const defaultJoinedOn = game.today < game.season.start ? game.season.start : game.today;

  return (
    <>
      <section className="card">
        <h2>Players</h2>
        <p className="muted">
          Season: {formatDate(game.season.start)}, {game.season.days} days. Each day opens at 5 AM MST.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Plays from</th>
                <th>Admin</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {game.playerRows.map((p) => (
                <tr key={p.id}>
                  <td>{p.display_name}</td>
                  <td>{p.email}</td>
                  <td>{formatDate(p.joined_on)}</td>
                  <td>
                    <form action={setAdmin}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="isAdmin" value={String(!p.is_admin)} />
                      <button type="submit" className="small" disabled={p.id === me.id}>
                        {p.is_admin ? "Admin ✓" : "Make admin"}
                      </button>
                    </form>
                  </td>
                  <td>
                    {p.id !== me.id ? (
                      <form action={removePlayer}>
                        <input type="hidden" name="id" value={p.id} />
                        <button type="submit" className="small danger">
                          Remove
                        </button>
                      </form>
                    ) : null}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="muted">Removing a player deletes their songs and ratings too.</p>
      </section>
      <section className="card">
        <h2>Add a player</h2>
        <AddPlayerForm defaultJoinedOn={defaultJoinedOn} />
      </section>

      <section className="card">
        <h2>Daily themes</h2>
        <p className="muted">
          Every second day is themed. A themed day&apos;s theme is drawn from the pool when the day opens at 5 AM
          MST, and players only see it then. You can set, redraw or clear any day&apos;s theme here, ahead of time
          or on the day.
        </p>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Day</th>
                <th>Theme</th>
                <th>Change it</th>
              </tr>
            </thead>
            <tbody>
              {seasonDates(game.season).map((date) => {
                const row = game.dayThemeRows.get(date);
                const opened = game.open.includes(date);
                const current = row
                  ? (row.text ?? "No theme")
                  : isDefaultThemed(game.season, date)
                    ? opened
                      ? "Waiting to be drawn"
                      : "Drawn at 5 AM"
                    : "No theme";
                return (
                  <tr key={date}>
                    <td>{formatDate(date)}</td>
                    <td className={row?.text ? undefined : "muted"}>{current}</td>
                    <td>
                      <form action={setDayTheme} className="inline">
                        <input type="hidden" name="date" value={date} />
                        <input type="hidden" name="mode" value="set" />
                        <input name="text" required maxLength={80} placeholder="Custom theme" aria-label={`Theme for ${formatDate(date)}`} />
                        <button type="submit" className="small">Set</button>
                      </form>
                      <form action={setDayTheme} className="inline">
                        <input type="hidden" name="date" value={date} />
                        <input type="hidden" name="mode" value="random" />
                        <button type="submit" className="small">Random</button>
                      </form>
                      <form action={setDayTheme} className="inline">
                        <input type="hidden" name="date" value={date} />
                        <input type="hidden" name="mode" value="none" />
                        <button type="submit" className="small">No theme</button>
                      </form>
                      {row ? (
                        <form action={setDayTheme} className="inline">
                          <input type="hidden" name="date" value={date} />
                          <input type="hidden" name="mode" value="reset" />
                          <button type="submit" className="small">Reset</button>
                        </form>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted">Reset puts a day back to the default: every second day gets a random theme.</p>
      </section>

      <section className="card">
        <h2>Theme pool</h2>
        <p className="muted">{game.themePool.length} themes. Ones already used are only drawn again once every theme has been used.</p>
        <AddThemeForm />
        <ul className="pool">
          {game.themePool.map((t) => (
            <li key={t.id}>
              <span>{t.text}</span>
              <form action={removeTheme}>
                <input type="hidden" name="id" value={t.id} />
                <button type="submit" className="small danger">Remove</button>
              </form>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}

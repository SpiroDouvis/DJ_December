import { removePlayer, setAdmin } from "@/app/actions";
import { AddPlayerForm } from "@/components/AddPlayerForm";
import { loadGame, requireAdmin } from "@/lib/data";
import { formatDate } from "@/lib/time";

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
    </>
  );
}

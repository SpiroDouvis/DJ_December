import Link from "next/link";
import { setService, signOut } from "@/app/actions";
import { requireMe } from "@/lib/data";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  return (
    <>
      <header className="top">
        <Link href="/" className="brand">
          DJ December
        </Link>
        <nav>
          <Link href="/">Today</Link>
          {me.is_admin ? <Link href="/admin">Admin</Link> : null}
        </nav>
        <div className="me">
          <form action={setService}>
            <label className="muted">
              Listen on{" "}
              <select name="service" defaultValue={me.service}>
                <option value="spotify">Spotify</option>
                <option value="apple">Apple Music</option>
              </select>
            </label>{" "}
            <button type="submit" className="small">
              Save
            </button>
          </form>
          <span>{me.display_name}</span>
          <form action={signOut}>
            <button type="submit" className="small">
              Sign out
            </button>
          </form>
        </div>
      </header>
      <main>{children}</main>
    </>
  );
}

import { signOut } from "@/app/actions";

export default function NotInvited() {
  return (
    <main className="center">
      <section className="card">
        <h1>You&apos;re not on the list</h1>
        <p>Ask the admin to add the Google email you signed in with, then try again.</p>
        <form action={signOut}>
          <button type="submit">Sign out</button>
        </form>
      </section>
    </main>
  );
}

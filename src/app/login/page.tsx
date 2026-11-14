import { signInWithGoogle } from "@/app/actions";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <main className="center">
      <section className="card">
        <h1>DJ December</h1>
        <p>A song a day, rated by your friends.</p>
        <form action={signInWithGoogle}>
          <button type="submit">Sign in with Google</button>
        </form>
        {error ? <p className="error">Sign-in didn&apos;t work. Try again.</p> : null}
      </section>
    </main>
  );
}

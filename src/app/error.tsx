"use client";

export default function ErrorPage({ error, reset }: { error: Error; reset: () => void }) {
  return (
    <main className="center">
      <section className="card">
        <h2>Something went wrong</h2>
        <p>{error.message}</p>
        <button onClick={reset}>Try again</button>
      </section>
    </main>
  );
}

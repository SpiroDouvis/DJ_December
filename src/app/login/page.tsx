import { signInWithGoogle } from "@/app/actions";
import { CenterCard } from "@/components/CenterCard";
import { Button } from "@/components/ui/button";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  const { error } = await searchParams;
  return (
    <CenterCard logo>
      <h1 className="sr-only">DJ December</h1>
      <p className="text-muted-foreground">A song a day, rated by your friends.</p>
      <form action={signInWithGoogle} className="w-full">
        <Button type="submit" size="lg" className="w-full">
          <svg viewBox="0 0 24 24" aria-hidden className="size-5">
            <path fill="currentColor" d="M21.35 11.1H12v2.98h5.35c-.23 1.4-1.66 4.1-5.35 4.1a5.94 5.94 0 0 1 0-11.88c1.84 0 3.07.78 3.78 1.46l2.58-2.49C16.71 3.74 14.56 2.8 12 2.8a9.2 9.2 0 1 0 0 18.4c5.31 0 8.83-3.73 8.83-8.99 0-.6-.06-1.06-.14-1.51Z" />
          </svg>
          Sign in with Google
        </Button>
      </form>
      {error ? <p className="text-sm text-destructive">Sign-in didn&apos;t work. Try again.</p> : null}
    </CenterCard>
  );
}

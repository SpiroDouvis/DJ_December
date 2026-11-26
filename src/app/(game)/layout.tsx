import Link from "next/link";
import { ChevronRight, FlaskConical } from "lucide-react";
import { leaveTestMode, setTestDay } from "@/app/test-actions";
import { Brand } from "@/components/Brand";
import { LiveRefresh } from "@/components/LiveRefresh";
import { NavLinks } from "@/components/NavLinks";
import { UserMenu } from "@/components/UserMenu";
import { Button } from "@/components/ui/button";
import { realMe, requireMe, testRound } from "@/lib/data";
import { liveChannel } from "@/lib/live";
import { supabasePublishableKey, supabaseUrl } from "@/lib/supabase/env";
import { formatDate } from "@/lib/time";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  const real = await realMe();
  const round = await testRound();
  return (
    <>
      <LiveRefresh url={supabaseUrl()} publishableKey={supabasePublishableKey()} channel={liveChannel(round !== null)} />
      {round ? (
        <div className="border-b border-warning/40 bg-warning/15 text-sm">
          <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-2">
            <FlaskConical className="size-4 text-warning" aria-hidden />
            <span className="font-semibold text-warning">Test round</span>
            <span className="text-muted-foreground">
              {formatDate(round.today)} · playing as <strong className="text-foreground">{me.display_name}</strong> ·
              nothing here touches the real game
            </span>
            <div className="ml-auto flex items-center gap-1.5">
              <form action={setTestDay}>
                <input type="hidden" name="mode" value="next" />
                <Button type="submit" size="sm" variant="secondary">
                  Next day
                  <ChevronRight />
                </Button>
              </form>
              <Button asChild size="sm" variant="secondary">
                <Link href="/test" className="no-underline">
                  Test controls
                </Link>
              </Button>
              <form action={leaveTestMode}>
                <Button type="submit" size="sm" variant="ghost">
                  Leave
                </Button>
              </form>
            </div>
          </div>
        </div>
      ) : null}
      <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <Link href="/" className="no-underline">
            <Brand />
          </Link>
          {/* Just the initial bubble in the top right, with the rest in its dropdown. */}
          <div className="ml-auto md:self-start">
            <UserMenu name={me.display_name} service={me.service} />
          </div>
          <NavLinks isAdmin={me.is_admin} canTest={real.is_admin} />
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:py-8">{children}</main>
    </>
  );
}

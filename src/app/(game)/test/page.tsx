import Link from "next/link";
import { dayHref } from "@/lib/calendar";
import {
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  FlaskConical,
  LogOut,
  Play,
  ShieldAlert,
  Trash2,
  UserRound,
  Users,
  Wand2,
} from "lucide-react";
import { actAs, leaveTestMode, resumeTestMode, setTestDay, wipeTestRound } from "@/app/test-actions";
import { SimulateForm, StartTestRoundForm } from "@/components/TestRoundForms";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { loadGame, requireMe, requireRealAdmin, testRound } from "@/lib/data";
import { dayOutcome } from "@/lib/game";
import { MAX_TEST_DAYS, MAX_TEST_PLAYERS } from "@/lib/sandbox";
import { dataClient } from "@/lib/supabase/server";
import { addDays, formatDate, seasonFromEnv } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function TestPage({ searchParams }: { searchParams: Promise<{ error?: string }> }) {
  await requireRealAdmin();
  const { error: actionError } = await searchParams;
  const saved = await dataClient("sandbox").from("settings").select("*").maybeSingle();
  const round = await testRound();

  return (
    <>
      <Card className="glow">
        <CardHeader>
          <CardTitle className="text-2xl">
            <FlaskConical className="size-6 text-violet-300" aria-hidden />
            Test round
          </CardTitle>
          <CardDescription className="text-base">
            Play a pretend DJ December with fake players and a clock you move yourself. It runs in a separate test
            sandbox, so the real players, songs, ratings, day themes and theme ideas are never touched. While a test
            round is on, every page (Today, Calendar, Ideas, Stats, Admin) shows the test game, and only for you.
          </CardDescription>
        </CardHeader>
      </Card>

      {actionError ? <ProblemCard title="That didn't work" message={actionError} /> : null}

      {saved.error ? (
        <Card className="border-warning/50">
          <CardHeader>
            <CardTitle>
              <ShieldAlert className="size-5 text-warning" aria-hidden />
              The test sandbox isn&apos;t set up yet
            </CardTitle>
            <CardDescription>
              Supabase said: {saved.error.message}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              <li>
                In Supabase, open the SQL editor and run <code>supabase/migrations/20261126000000_test_sandbox.sql</code>.
              </li>
              <li>
                Go to Project Settings &gt; Data API, add <code>sandbox</code> to Exposed schemas, and save.
              </li>
              <li>Reload this page.</li>
            </ol>
          </CardContent>
        </Card>
      ) : null}

      {round ? <RunningRound /> : null}

      {!round && saved.data ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <Play className="size-5 text-violet-300" aria-hidden />
              A test round is saved
            </CardTitle>
            <CardDescription>
              {saved.data.season_days} days from {formatDate(saved.data.season_start)}, paused on{" "}
              {formatDate(saved.data.today)}. You&apos;re looking at the real game right now.
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            <form action={resumeTestMode}>
              <Button type="submit">
                <Play />
                Go back into the test round
              </Button>
            </form>
            <form action={wipeTestRound}>
              <Button type="submit" variant="destructive">
                <Trash2 />
                Delete it
              </Button>
            </form>
          </CardContent>
        </Card>
      ) : null}

      {!saved.error ? (
        <Card>
          <CardHeader>
            <CardTitle>
              <FlaskConical className="size-5 text-violet-300" aria-hidden />
              {saved.data ? "Start over" : "Start a test round"}
            </CardTitle>
            <CardDescription>
              You play as yourself. Other players borrow your real players&apos; names with &quot;(test)&quot; after
              them, then made-up names. Nobody can sign in as them; you switch between them below.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <StartTestRoundForm
              defaultStart={seasonFromEnv().start}
              maxPlayers={MAX_TEST_PLAYERS}
              maxDays={MAX_TEST_DAYS}
              hasRound={Boolean(saved.data)}
            />
          </CardContent>
        </Card>
      ) : null}
    </>
  );
}

function ProblemCard({ title, message }: { title: string; message: string }) {
  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle>
          <ShieldAlert className="size-5 text-destructive" aria-hidden />
          {title}
        </CardTitle>
        <CardDescription className="break-words">{message}</CardDescription>
      </CardHeader>
    </Card>
  );
}

async function RunningRound() {
  let me, game;
  try {
    me = await requireMe();
    game = await loadGame();
  } catch (e) {
    console.error("Loading the test round failed", e);
    const message =
      e && typeof e === "object" && "message" in e ? String((e as { message: unknown }).message) : String(e);
    return (
      <>
        <ProblemCard title="The test round couldn't load" message={message} />
        <Card>
          <CardContent className="flex flex-wrap gap-2">
            <form action={leaveTestMode}>
              <Button type="submit" variant="secondary">
                <LogOut />
                Back to the real game
              </Button>
            </form>
            <form action={wipeTestRound}>
              <Button type="submit" variant="destructive">
                <Trash2 />
                Delete test data
              </Button>
            </form>
          </CardContent>
        </Card>
      </>
    );
  }
  const nameOf = (id: string) => game.players.find((p) => p.id === id)?.name ?? "?";
  const last = addDays(game.season.start, game.season.days - 1);
  const dayNumber = game.open.length;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>
            <CalendarClock className="size-5 text-violet-300" aria-hidden />
            Test clock
          </CardTitle>
          <CardDescription>
            {dayNumber === 0
              ? `It's the night before the test season. Day 1 is ${formatDate(game.season.start)}.`
              : `It's ${formatDate(game.today)}, day ${dayNumber} of ${game.season.days}.`}{" "}
            Moving to the next day is the same as 5 AM MST arriving: the day opens with whatever theme you gave it on
            the calendar.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-center gap-2">
          <form action={setTestDay}>
            <input type="hidden" name="mode" value="prev" />
            <Button type="submit" variant="secondary" disabled={dayNumber === 0}>
              <ChevronLeft />
              Back a day
            </Button>
          </form>
          <form action={setTestDay}>
            <input type="hidden" name="mode" value="next" />
            <Button type="submit" disabled={game.today >= last}>
              Next day
              <ChevronRight />
            </Button>
          </form>
          <form action={setTestDay} className="flex items-center gap-2">
            <input type="hidden" name="mode" value="date" />
            <Input
              name="date"
              type="date"
              min={addDays(game.season.start, -1)}
              max={last}
              defaultValue={game.today}
              aria-label="Jump to day"
              className="w-40"
            />
            <Button type="submit" variant="secondary">
              Jump
            </Button>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Users className="size-5 text-violet-300" aria-hidden />
            Play as
          </CardTitle>
          <CardDescription>
            Switch player to send songs and rate as them on the normal pages. Leave someone out of the fill-in below to
            see how a slacking or late player looks.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {game.playerRows.map((p) =>
            p.id === me.id ? (
              <Badge key={p.id} className="h-8 px-3 text-sm">
                <UserRound />
                {p.display_name} (playing now)
              </Badge>
            ) : (
              <form key={p.id} action={actAs}>
                <input type="hidden" name="id" value={p.id} />
                <Button type="submit" size="sm" variant="secondary">
                  {p.display_name}
                </Button>
              </form>
            ),
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <Wand2 className="size-5 text-violet-300" aria-hidden />
            Fill in for players
          </CardTitle>
          <CardDescription>
            Sends the songs players owe on every open day (stand-in songs that link to a Spotify search) and gives the
            ratings they owe. Run it again after a tie to play the tiebreak.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SimulateForm players={game.players.map((p) => ({ id: p.id, name: p.name }))} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <CalendarClock className="size-5 text-violet-300" aria-hidden />
            Test days
          </CardTitle>
        </CardHeader>
        <CardContent>
          {game.open.length === 0 ? (
            <p className="text-sm text-muted-foreground">No day has opened yet. Press Next day to open day 1.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Day</TableHead>
                  <TableHead>Theme</TableHead>
                  <TableHead>Where it stands</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {[...game.open].reverse().map((date) => {
                  const o = dayOutcome(date, game.players, game.submissions, game.ratings);
                  const c = o.current;
                  const label = c.round > 1 ? `Tiebreak ${c.round - 1}: ` : "";
                  const status = o.winner
                    ? `${nameOf(o.winner.playerId)} won${o.rounds.length > 1 ? " after a tiebreak" : ""}`
                    : c.missingSongs.length > 0
                      ? `${label}waiting on songs from ${c.missingSongs.map((p) => p.name).join(", ")}`
                      : c.ratingsLeft.length > 0
                        ? `${label}waiting on ratings from ${c.ratingsLeft.map((r) => r.player.name).join(", ")}`
                        : `${label}revealed`;
                  return (
                    <TableRow key={date}>
                      <TableCell>
                        <Link href={dayHref(date)} className="text-violet-200 underline hover:text-white">
                          {formatDate(date)}
                        </Link>
                      </TableCell>
                      <TableCell>
                        {game.themes.get(date) ? (
                          <Badge>{game.themes.get(date)}</Badge>
                        ) : (
                          <span className="text-muted-foreground">None</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-normal">
                        {o.winner ? <Badge variant="gold">{status}</Badge> : status}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>
            <LogOut className="size-5 text-violet-300" aria-hidden />
            Finish testing
          </CardTitle>
          <CardDescription>
            Leaving keeps the test round so you can come back to it. Deleting wipes all test data. Neither touches the
            real game.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          <form action={leaveTestMode}>
            <Button type="submit" variant="secondary">
              <LogOut />
              Back to the real game
            </Button>
          </form>
          <form action={wipeTestRound}>
            <Button type="submit" variant="destructive">
              <Trash2 />
              Delete test data
            </Button>
          </form>
        </CardContent>
      </Card>
    </>
  );
}

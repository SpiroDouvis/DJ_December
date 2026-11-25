import { Crown, Grid3x3, Heart, Medal } from "lucide-react";
import type { Game } from "@/lib/data";
import { dayOutcome } from "@/lib/game";
import { computeStats } from "@/lib/stats";
import { RevealRow, RevealRows, Stagger, StaggerItem } from "./motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";

const fmt = (n: number | null) => (n === null ? "—" : n.toFixed(1));

/** Cell background that gets more purple the higher the average rating (1–10). */
const heat = (avg: number) => ({ backgroundColor: `oklch(0.6 0.22 300 / ${Math.max(0.05, (avg - 1) / 9) * 0.55})` });

export function StatsView({ game }: { game: Game }) {
  const outcomes = game.open.map((d) => dayOutcome(d, game.players, game.submissions, game.ratings));
  const stats = computeStats(game.players, outcomes, game.ratings);
  const people = stats.players.map((s) => s.player);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <Medal className="size-5 text-gold" aria-hidden />
            Standings
          </CardTitle>
          <CardDescription>
            From {stats.revealedDays} revealed {stats.revealedDays === 1 ? "day" : "days"}. Days still waiting on
            songs or ratings don&apos;t count yet.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Player</TableHead>
                <TableHead>Wins</TableHead>
                <TableHead>Songs</TableHead>
                <TableHead>Points received</TableHead>
                <TableHead>Avg rating received</TableHead>
                <TableHead>Ratings given</TableHead>
                <TableHead>Avg rating given</TableHead>
              </TableRow>
            </TableHeader>
            <RevealRows>
              {stats.players.map((s, i) => {
                const leader = i === 0 && s.wins > 0;
                return (
                  <RevealRow key={s.player.id} winner={leader}>
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <span className="inline-flex items-center gap-1.5 font-medium">
                        {leader ? <Crown className="size-4 text-gold" aria-label="Leader" /> : null}
                        {s.player.name}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 font-mono font-bold tabular-nums text-violet-200">{s.wins}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{s.songs}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{s.pointsReceived.toFixed(1)}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{fmt(s.avgReceived)}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{s.ratingsGiven}</td>
                    <td className="px-3 py-2.5 font-mono tabular-nums">{fmt(s.avgGiven)}</td>
                  </RevealRow>
                );
              })}
            </RevealRows>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <Grid3x3 className="size-5 text-violet-300" aria-hidden />
            Who rates whom
          </CardTitle>
          <CardDescription>
            Each row is a rater, each column the player whose songs they rated. Cells show the average rating given,
            with the number of ratings in brackets.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rater ↓ / Song by →</TableHead>
                {people.map((p) => (
                  <TableHead key={p.id}>{p.name}</TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {people.map((rater) => (
                <TableRow key={rater.id}>
                  <TableCell className="font-semibold text-muted-foreground">{rater.name}</TableCell>
                  {people.map((target) => {
                    if (rater.id === target.id)
                      return (
                        <TableCell key={target.id} className="text-muted-foreground">
                          —
                        </TableCell>
                      );
                    const cell = stats.pairs.get(rater.id)?.get(target.id);
                    return (
                      <TableCell key={target.id} className="font-mono tabular-nums" style={cell ? heat(cell.avg) : undefined}>
                        {cell ? (
                          <>
                            {cell.avg.toFixed(1)} <span className="text-xs text-muted-foreground">({cell.count})</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <Heart className="size-5 text-fuchsia-400" aria-hidden />
            Biggest fans and toughest critics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Stagger className="grid gap-2 sm:grid-cols-2">
            {stats.players.map((s) => (
              <StaggerItem key={s.player.id} className="rounded-lg border bg-background/40 px-4 py-3 text-sm">
                <strong className="text-base">{s.player.name}</strong>{" "}
                {s.favourite && s.toughest ? (
                  <>
                    rates {s.favourite.player.name} highest ({s.favourite.avg.toFixed(1)}) and{" "}
                    {s.toughest.player.name} lowest ({s.toughest.avg.toFixed(1)}).
                  </>
                ) : (
                  <span className="text-muted-foreground">needs a couple more revealed days to tell.</span>
                )}
              </StaggerItem>
            ))}
          </Stagger>
        </CardContent>
      </Card>
    </>
  );
}

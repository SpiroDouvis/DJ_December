import { removeQueuedSong, setAvailability } from "@/app/actions";
import { CalendarClock, ListMusic, Sparkles, Trash2 } from "lucide-react";
import { SongCard } from "./SongCard";
import { SubmitSongForm } from "./SubmitSongForm";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "./ui/card";
import { Input } from "./ui/input";
import { NativeSelect } from "./ui/native-select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "./ui/table";
import type { Game, Me } from "@/lib/data";
import { availabilityKey, queueBlocker } from "@/lib/schedule";
import { isThemed } from "@/lib/themes";
import { formatDate, seasonDates } from "@/lib/time";

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const weekday = (date: string) => WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];

export function ScheduleView({ game, me }: { game: Game; me: Me }) {
  const upcoming = seasonDates(game.season).filter((d) => d > game.today && d >= me.joined_on);
  const fromToday = seasonDates(game.season).filter((d) => d >= game.today);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <ListMusic className="size-5 text-violet-300" aria-hidden />
            Queue songs
          </CardTitle>
          <CardDescription>
          Pick songs ahead for days without a theme. Each one goes in automatically when its day opens at 5 AM MST,
          and you can swap or remove it until then. Theme days stay secret until the morning, so they can&apos;t be
          queued. If an admin later gives a day a theme, any songs queued for it are dropped.
          </CardDescription>
        </CardHeader>
        <CardContent>
        {upcoming.length === 0 ? <p className="text-muted-foreground">No upcoming days left this season.</p> : null}
        <div className="grid">
          {upcoming.map((date) => {
            const queued = game.submissions.find(
              (s) => s.playerId === me.id && s.date === date && s.round === 1,
            );
            const song = queued ? game.songs.get(queued.songId) : undefined;
            const blocker = queueBlocker(date, game.today, game.season, me.joined_on, game.dayThemeRows);
            return (
              <div key={date} className="grid grid-cols-[64px_1fr] gap-4 border-t py-4 first:border-t-0 first:pt-0">
                <div className="flex flex-col items-center justify-start rounded-lg border bg-background/40 py-2 text-center">
                  <span className="text-[11px] font-semibold tracking-wider text-violet-300 uppercase">{weekday(date)}</span>
                  <strong className="text-sm">{formatDate(date)}</strong>
                </div>
                <div className="flex min-w-0 flex-col gap-2">
                  {isThemed(game.season, date, game.dayThemeRows) ? (
                    <p className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="size-4 text-violet-300" aria-hidden />
                      Theme day: revealed at 5 AM.
                    </p>
                  ) : song ? (
                    <>
                      <div className="max-w-md">
                        <SongCard song={song} service={me.service} label="Queued" />
                      </div>
                      <details className="rounded-lg border bg-background/30 px-4 py-2 open:pb-4">
                        <summary className="cursor-pointer text-sm text-muted-foreground marker:text-violet-300 hover:text-foreground">
                          Swap or remove
                        </summary>
                        <div className="mt-3 flex flex-col gap-3">
                          <SubmitSongForm date={date} cta="Swap song" />
                          <form action={removeQueuedSong}>
                            <input type="hidden" name="date" value={date} />
                            <Button type="submit" variant="destructive" size="sm">
                              <Trash2 />
                              Remove
                            </Button>
                          </form>
                        </div>
                      </details>
                    </>
                  ) : blocker ? (
                    <p className="text-sm text-muted-foreground">{blocker}</p>
                  ) : (
                    <SubmitSongForm date={date} cta="Queue" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <CalendarClock className="size-5 text-violet-300" aria-hidden />
            When you can rate
          </CardTitle>
          <CardDescription>
          Let everyone know when you&apos;re free or busy to listen and rate. It shows next to your name when a day is
          waiting on you.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>You</TableHead>
                {game.players
                  .filter((p) => p.id !== me.id)
                  .map((p) => (
                    <TableHead key={p.id}>{p.name}</TableHead>
                  ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {fromToday.map((date) => {
                const mine = game.availability.get(availabilityKey(me.id, date));
                return (
                  <TableRow key={date}>
                    <TableCell>
                      {formatDate(date)} <span className="text-muted-foreground">{weekday(date)}</span>
                    </TableCell>
                    <TableCell>
                      <form action={setAvailability} className="flex items-center gap-1.5">
                        <input type="hidden" name="date" value={date} />
                        <NativeSelect
                          name="status"
                          defaultValue={mine?.status ?? ""}
                          aria-label={`Your availability on ${formatDate(date)}`}
                          className="h-8 text-xs"
                        >
                          <option value="">Not set</option>
                          <option value="available">Free</option>
                          <option value="busy">Busy</option>
                        </NativeSelect>
                        <Input
                          name="note"
                          maxLength={60}
                          defaultValue={mine?.note ?? ""}
                          placeholder="e.g. after 8pm"
                          aria-label="Note"
                          className="h-8 w-36 text-xs"
                        />
                        <Button type="submit" variant="secondary" size="sm">
                          Save
                        </Button>
                      </form>
                    </TableCell>
                    {game.players
                      .filter((p) => p.id !== me.id)
                      .map((p) => {
                        const a = game.availability.get(availabilityKey(p.id, date));
                        return (
                          <TableCell key={p.id}>
                            {a ? (
                              <Badge variant={a.status === "available" ? "success" : "warning"}>
                                {a.status === "available" ? "Free" : "Busy"}
                              </Badge>
                            ) : (
                              <span className="text-muted-foreground">—</span>
                            )}
                            {a?.note ? <span className="text-xs text-muted-foreground"> · {a.note}</span> : null}
                          </TableCell>
                        );
                      })}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}

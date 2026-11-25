import { removePlayer, removeTheme, setAdmin, setDayTheme } from "@/app/actions";
import { AddThemeForm } from "@/components/AddThemeForm";
import { AddPlayerForm } from "@/components/AddPlayerForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Ban, Dices, Library, Sparkles, Trash2, Undo2, UserPlus, Users } from "lucide-react";
import { loadGame, requireAdmin } from "@/lib/data";
import { isDefaultThemed } from "@/lib/themes";
import { formatDate, seasonDates } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const me = await requireAdmin();
  const game = await loadGame();
  const defaultJoinedOn = game.today < game.season.start ? game.season.start : game.today;

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <Users className="size-5 text-violet-300" aria-hidden />
            Players
          </CardTitle>
          <CardDescription>
            Season: {formatDate(game.season.start)}, {game.season.days} days. Each day opens at 5 AM MST.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Plays from</TableHead>
                <TableHead>Admin</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {game.playerRows.map((p) => (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{p.display_name}</TableCell>
                  <TableCell className="text-muted-foreground">{p.email}</TableCell>
                  <TableCell>{formatDate(p.joined_on)}</TableCell>
                  <TableCell>
                    <form action={setAdmin}>
                      <input type="hidden" name="id" value={p.id} />
                      <input type="hidden" name="isAdmin" value={String(!p.is_admin)} />
                      <Button type="submit" size="sm" variant={p.is_admin ? "default" : "secondary"} disabled={p.id === me.id}>
                        {p.is_admin ? "Admin ✓" : "Make admin"}
                      </Button>
                    </form>
                  </TableCell>
                  <TableCell>
                    {p.id !== me.id ? (
                      <form action={removePlayer}>
                        <input type="hidden" name="id" value={p.id} />
                        <Button type="submit" size="sm" variant="destructive">
                          <Trash2 />
                          Remove
                        </Button>
                      </form>
                    ) : null}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          <CardDescription>Removing a player deletes their songs and ratings too.</CardDescription>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <UserPlus className="size-5 text-violet-300" aria-hidden />
            Add a player
          </CardTitle>
        </CardHeader>
        <CardContent>
          <AddPlayerForm defaultJoinedOn={defaultJoinedOn} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <Sparkles className="size-5 text-violet-300" aria-hidden />
            Daily themes
          </CardTitle>
          <CardDescription>
          Every second day is themed. A themed day&apos;s theme is drawn from the pool when the day opens at 5 AM
          MST, and players only see it then. You can set, redraw or clear any day&apos;s theme here, ahead of time
          or on the day.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Day</TableHead>
                <TableHead>Theme</TableHead>
                <TableHead>Change it</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {seasonDates(game.season).map((date) => {
                const row = game.dayThemeRows.get(date);
                const opened = game.open.includes(date);
                const current = row
                  ? (row.text ?? "No theme")
                  : isDefaultThemed(game.season, date)
                    ? opened
                      ? "Waiting to be drawn"
                      : "Drawn at 5 AM"
                    : "No theme";
                return (
                  <TableRow key={date}>
                    <TableCell>{formatDate(date)}</TableCell>
                    <TableCell>
                      {row?.text ? (
                        <Badge>{current}</Badge>
                      ) : (
                        <span className="text-muted-foreground">{current}</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1.5">
                        <form action={setDayTheme} className="flex items-center gap-1.5">
                          <input type="hidden" name="date" value={date} />
                          <input type="hidden" name="mode" value="set" />
                          <Input
                            name="text"
                            required
                            maxLength={80}
                            placeholder="Custom theme"
                            aria-label={`Theme for ${formatDate(date)}`}
                            className="h-8 w-44 text-xs"
                          />
                          <Button type="submit" size="sm">
                            Set
                          </Button>
                        </form>
                        <form action={setDayTheme}>
                          <input type="hidden" name="date" value={date} />
                          <input type="hidden" name="mode" value="random" />
                          <Button type="submit" size="sm" variant="secondary">
                            <Dices />
                            Random
                          </Button>
                        </form>
                        <form action={setDayTheme}>
                          <input type="hidden" name="date" value={date} />
                          <input type="hidden" name="mode" value="none" />
                          <Button type="submit" size="sm" variant="secondary">
                            <Ban />
                            No theme
                          </Button>
                        </form>
                        {row ? (
                          <form action={setDayTheme}>
                            <input type="hidden" name="date" value={date} />
                            <input type="hidden" name="mode" value="reset" />
                            <Button type="submit" size="sm" variant="ghost">
                              <Undo2 />
                              Reset
                            </Button>
                          </form>
                        ) : null}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <CardDescription>Reset puts a day back to the default: every second day gets a random theme.</CardDescription>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <Library className="size-5 text-violet-300" aria-hidden />
            Theme pool
          </CardTitle>
          <CardDescription>
            {game.themePool.length} themes. Ones already used are only drawn again once every theme has been used.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <AddThemeForm />
          <ul className="grid gap-2 sm:grid-cols-2">
            {game.themePool.map((t) => (
              <li key={t.id} className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 py-1.5 pr-1.5 pl-3 text-sm">
                <span className="min-w-0 truncate">{t.text}</span>
                <form action={removeTheme}>
                  <input type="hidden" name="id" value={t.id} />
                  <Button type="submit" size="icon" variant="ghost" className="size-8 text-muted-foreground hover:text-destructive" aria-label={`Remove ${t.text}`}>
                    <Trash2 />
                  </Button>
                </form>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </>
  );
}

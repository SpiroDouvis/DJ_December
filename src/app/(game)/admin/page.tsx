import Link from "next/link";
import { removePlayer, setAdmin } from "@/app/actions";
import { AddPlayerForm } from "@/components/AddPlayerForm";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Library, Sparkles, Trash2, UserPlus, Users } from "lucide-react";
import { loadGame, requireAdmin } from "@/lib/data";
import { formatDate } from "@/lib/time";

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
            Only days you give a theme are themed. Assign themes on the{" "}
            <Link href="/calendar" className="text-violet-200 underline hover:text-white">
              Calendar
            </Link>
            : drag ideas onto days, or tap a day and pick from its list. Everyone sees the calendar update live.{" "}
            {game.themes.size} {game.themes.size === 1 ? "day has" : "days have"} a theme so far.
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-xl">
            <Library className="size-5 text-violet-300" aria-hidden />
            Theme pool
          </CardTitle>
          <CardDescription>
            The pool is made of players&apos; ideas: {game.themePool.length} so far. The calendar's Random pick prefers
            ideas not used yet. As admin you can remove any idea on the{" "}
            <Link href="/ideas" className="text-violet-200 underline hover:text-white">
              Ideas page
            </Link>
            .
          </CardDescription>
        </CardHeader>
      </Card>
    </>
  );
}

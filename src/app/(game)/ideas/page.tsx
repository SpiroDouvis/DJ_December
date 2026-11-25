import { Lightbulb, Trash2 } from "lucide-react";
import { removeTheme } from "@/app/actions";
import { ThemeIdeaForm } from "@/components/ThemeIdeaForm";
import { Stagger, StaggerItem } from "@/components/motion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { loadGame, requireMe } from "@/lib/data";
import { usedOn } from "@/lib/themes";
import { formatDate } from "@/lib/time";

export const dynamic = "force-dynamic";

export default async function IdeasPage() {
  const me = await requireMe();
  const game = await loadGame();
  const nameOf = (id: string | null) =>
    id === me.id ? "You" : (game.players.find((p) => p.id === id)?.name ?? "A former player");
  // Only days that have opened, so nobody learns a future day's theme from this page.
  const revealed = usedOn(game.open, game.dayThemeRows);
  // Every saved pick, to stop a player removing an idea already chosen for a day.
  const picked = new Set([...game.dayThemeRows.values()].map((r) => r.themeId).filter(Boolean));
  const unused = game.themePool.filter((t) => !revealed.has(t.id)).length;
  const mine = game.themePool.filter((t) => t.submittedBy === me.id).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">
          <Lightbulb className="size-5 text-violet-300" aria-hidden />
          Theme ideas
        </CardTitle>
        <CardDescription>
          Every second day gets a theme, drawn at random from these ideas when the day opens at 5 AM MST. Add as many
          as you like, before December starts or during the game. Ideas that haven&apos;t come up yet are drawn first.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <ThemeIdeaForm />
        <p className="text-sm text-muted-foreground">
          {game.themePool.length} {game.themePool.length === 1 ? "idea" : "ideas"} in the pool, {unused} not used
          yet. {mine} {mine === 1 ? "is" : "are"} yours.
        </p>
        {game.themePool.length === 0 ? (
          <p className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
            No ideas yet. Be the first to add one.
          </p>
        ) : (
          <Stagger className="grid gap-2 sm:grid-cols-2">
            {game.themePool.map((t) => {
              const usedDate = revealed.get(t.id);
              const canRemove = me.is_admin || (t.submittedBy === me.id && !picked.has(t.id));
              return (
                <StaggerItem
                  key={t.id}
                  className="flex items-center justify-between gap-3 rounded-lg border bg-background/40 py-1.5 pr-1.5 pl-3 text-sm"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium" title={t.text}>
                      {t.text}
                    </p>
                    <p className="flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
                      by {nameOf(t.submittedBy)}
                      {usedDate ? <Badge variant="secondary">Used {formatDate(usedDate)}</Badge> : null}
                    </p>
                  </div>
                  {canRemove ? (
                    <form action={removeTheme}>
                      <input type="hidden" name="id" value={t.id} />
                      <Button
                        type="submit"
                        size="icon"
                        variant="ghost"
                        className="size-8 text-muted-foreground hover:text-destructive"
                        aria-label={`Remove ${t.text}`}
                      >
                        <Trash2 />
                      </Button>
                    </form>
                  ) : (
                    <span className="size-8" aria-hidden />
                  )}
                </StaggerItem>
              );
            })}
          </Stagger>
        )}
      </CardContent>
    </Card>
  );
}

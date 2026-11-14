import { notFound } from "next/navigation";
import { OpenDay, RevealedDay } from "@/components/DayView";
import { loadGame, requireMe } from "@/lib/data";
import { dayStatus } from "@/lib/game";

export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const me = await requireMe();
  const game = await loadGame();
  if (!game.open.includes(date)) notFound();
  const status = dayStatus(date, game.players, game.submissions, game.ratings);
  return status.revealed ? (
    <RevealedDay game={game} me={me} date={date} />
  ) : (
    <OpenDay game={game} me={me} date={date} />
  );
}

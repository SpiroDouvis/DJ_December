import { notFound } from "next/navigation";
import { DayView } from "@/components/DayView";
import { loadGame, requireMe } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function DayPage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  const me = await requireMe();
  const game = await loadGame();
  if (!game.open.includes(date)) notFound();
  return <DayView game={game} me={me} date={date} />;
}

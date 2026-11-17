import { ScheduleView } from "@/components/ScheduleView";
import { loadGame, requireMe } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function SchedulePage() {
  const me = await requireMe();
  const game = await loadGame();
  return <ScheduleView game={game} me={me} />;
}

import { StatsView } from "@/components/StatsView";
import { loadGame, requireMe } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  await requireMe();
  const game = await loadGame();
  return <StatsView game={game} />;
}

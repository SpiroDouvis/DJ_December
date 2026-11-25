import { FadeIn } from "@/components/motion";

/** Re-mounts on every navigation, so each tab glides in. */
export default function GameTemplate({ children }: { children: React.ReactNode }) {
  return (
    <FadeIn y={10} className="flex flex-col gap-6">
      {children}
    </FadeIn>
  );
}

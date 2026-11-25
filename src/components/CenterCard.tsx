import { FadeIn } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";

/** Full-screen centred card for login, not-invited and error screens. */
export function CenterCard({ children }: { children: React.ReactNode }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <FadeIn className="w-full max-w-md">
        <Card className="glow text-center">
          <CardContent className="flex flex-col items-center gap-4">{children}</CardContent>
        </Card>
      </FadeIn>
    </main>
  );
}

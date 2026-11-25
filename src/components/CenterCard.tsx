import { Brand } from "@/components/Brand";
import { FadeIn } from "@/components/motion";
import { Card, CardContent } from "@/components/ui/card";

/** Full-screen centred card for login, not-invited and error screens, with the logo above it. */
export function CenterCard({ children, logo = false }: { children: React.ReactNode; logo?: boolean }) {
  return (
    <main className="grid min-h-dvh place-items-center px-4 py-10">
      <FadeIn className="flex w-full max-w-md flex-col items-center gap-6">
        {logo ? <Brand large /> : null}
        <Card className="glow w-full text-center">
          <CardContent className="flex flex-col items-center gap-4">{children}</CardContent>
        </Card>
      </FadeIn>
    </main>
  );
}

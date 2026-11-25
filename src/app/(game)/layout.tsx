import Link from "next/link";
import { Headphones, LogOut } from "lucide-react";
import { setService, signOut } from "@/app/actions";
import { Brand } from "@/components/Brand";
import { NavLinks } from "@/components/NavLinks";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { requireMe } from "@/lib/data";

export default async function GameLayout({ children }: { children: React.ReactNode }) {
  const me = await requireMe();
  return (
    <>
      <header className="sticky top-0 z-40 border-b bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-3 px-4 py-3">
          <Link href="/" className="no-underline">
            <Brand />
          </Link>
          <NavLinks isAdmin={me.is_admin} />
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <form action={setService} className="flex items-center gap-1.5">
              <Headphones className="size-4 text-muted-foreground" aria-hidden />
              <NativeSelect name="service" defaultValue={me.service} aria-label="Listen on" className="h-8 text-xs">
                <option value="spotify">Spotify</option>
                <option value="apple">Apple Music</option>
              </NativeSelect>
              <Button type="submit" variant="secondary" size="sm">
                Save
              </Button>
            </form>
            <span className="flex items-center gap-2 text-sm">
              <span className="grid size-8 place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-xs font-bold text-white">
                {me.display_name.slice(0, 1).toUpperCase()}
              </span>
              <span className="hidden md:inline">{me.display_name}</span>
            </span>
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" aria-label="Sign out">
                <LogOut />
                <span className="hidden sm:inline">Sign out</span>
              </Button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6 sm:py-8">{children}</main>
    </>
  );
}

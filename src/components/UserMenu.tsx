"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Headphones, LogOut } from "lucide-react";
import { setService, signOut } from "@/app/actions";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Service } from "@/lib/music";

/** Desktop account menu: just the initial bubble, with the listening service, name and sign out in a dropdown. */
export function UserMenu({ name, service }: { name: string; service: Service }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onPointer);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Account menu for ${name}`}
        className="grid size-9 cursor-pointer place-items-center rounded-full bg-gradient-to-br from-primary to-fuchsia-500 text-sm font-bold text-white outline-none transition-shadow hover:shadow-[0_0_0_3px_var(--ring)] focus-visible:shadow-[0_0_0_3px_var(--ring)]"
      >
        {name.slice(0, 1).toUpperCase()}
      </button>
      <AnimatePresence>
        {open ? (
          <motion.div
            role="menu"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute top-full right-0 z-50 mt-2 w-64 origin-top-right rounded-xl border bg-popover/95 p-3 text-popover-foreground shadow-xl backdrop-blur-xl"
          >
            <p className="truncate px-1 font-semibold">{name}</p>
            <div className="my-3 h-px bg-border" />
            <form action={setService} className="grid gap-1.5 px-1">
              <label htmlFor="user-menu-service" className="flex items-center gap-1.5 text-xs text-muted-foreground">
                <Headphones className="size-3.5" aria-hidden />
                Listen on
              </label>
              <NativeSelect
                id="user-menu-service"
                name="service"
                defaultValue={service}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="h-8 text-sm"
              >
                <option value="spotify">Spotify</option>
                <option value="apple">Apple Music</option>
              </NativeSelect>
            </form>
            <div className="my-3 h-px bg-border" />
            <form action={signOut}>
              <Button type="submit" variant="ghost" size="sm" className="w-full justify-start">
                <LogOut />
                Sign out
              </Button>
            </form>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
}

"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion } from "motion/react";
import { CalendarDays, ChartColumn, Disc3, FlaskConical, Lightbulb, Shield } from "lucide-react";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/", label: "Today", icon: Disc3 },
  { href: "/calendar", label: "Calendar", icon: CalendarDays },
  { href: "/ideas", label: "Ideas", icon: Lightbulb },
  { href: "/stats", label: "Stats", icon: ChartColumn },
  { href: "/admin", label: "Admin", icon: Shield, admin: true },
  { href: "/test", label: "Test", icon: FlaskConical, test: true },
];

export function NavLinks({ isAdmin, canTest }: { isAdmin: boolean; canTest: boolean }) {
  const path = usePathname();
  const active = (href: string) => (href === "/" ? path === "/" : path.startsWith(href));
  return (
    <nav className="isolate flex items-center gap-1 rounded-full border bg-background/40 p-1">
      {LINKS.filter((l) => (!l.admin || isAdmin) && (!l.test || canTest)).map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            "relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-medium no-underline transition-colors",
            active(href) ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {active(href) ? (
            <motion.span
              layoutId="nav-pill"
              className="absolute inset-0 -z-10 rounded-full bg-primary shadow-[0_4px_20px_-6px_var(--primary)]"
              transition={{ type: "spring", stiffness: 400, damping: 32 }}
            />
          ) : null}
          <Icon className="size-4" />
          <span className="hidden sm:inline">{label}</span>
        </Link>
      ))}
    </nav>
  );
}

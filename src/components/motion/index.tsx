"use client";

import { motion, MotionConfig, type HTMLMotionProps } from "motion/react";
import { Crown, Sparkles, Swords } from "lucide-react";
import { cn } from "@/lib/utils";

const ease = [0.22, 1, 0.36, 1] as const;

/** Honour the visitor's "reduce motion" setting everywhere. */
export function MotionProvider({ children }: { children: React.ReactNode }) {
  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}

/** Fades and lifts its content in when it mounts. */
export function FadeIn({ delay = 0, y = 12, className, ...props }: HTMLMotionProps<"div"> & { delay?: number; y?: number }) {
  return (
    <motion.div
      initial={{ opacity: 0, y }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease, delay }}
      className={className}
      {...props}
    />
  );
}

const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.05 } },
};
const item = {
  hidden: { opacity: 0, y: 14, scale: 0.98 },
  show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.4, ease } },
};

/** Children wrapped in StaggerItem appear one after another. */
export function Stagger({ className, ...props }: HTMLMotionProps<"div">) {
  return <motion.div variants={stagger} initial="hidden" animate="show" className={className} {...props} />;
}

export function StaggerItem({ className, ...props }: HTMLMotionProps<"div">) {
  return <motion.div variants={item} className={className} {...props} />;
}

/** Table rows that slide in one by one, slowest at the bottom, for results reveals. */
export function RevealRows({ children }: { children: React.ReactNode }) {
  return (
    <motion.tbody variants={stagger} initial="hidden" animate="show" className="[&_tr:last-child]:border-0">
      {children}
    </motion.tbody>
  );
}

export function RevealRow({ className, winner, ...props }: HTMLMotionProps<"tr"> & { winner?: boolean }) {
  return (
    <motion.tr
      variants={{
        hidden: { opacity: 0, x: -16 },
        show: { opacity: 1, x: 0, transition: { duration: 0.4, ease } },
      }}
      data-state={winner ? "winner" : undefined}
      className={cn("border-b transition-colors hover:bg-accent/30 data-[state=winner]:bg-primary/15", className)}
      {...props}
    />
  );
}

/** The day's theme, revealed with a soft blur-in and a shimmer. */
export function ThemeReveal({ theme }: { theme: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.94, filter: "blur(8px)" }}
      animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
      transition={{ duration: 0.7, ease }}
      className="relative inline-flex max-w-full items-center gap-2 overflow-hidden rounded-full border border-primary/40 bg-gradient-to-r from-primary/25 via-fuchsia-500/15 to-primary/25 px-4 py-1.5 text-sm"
    >
      <Sparkles className="size-4 shrink-0 text-violet-300" />
      <span className="text-muted-foreground">Theme</span>
      <strong className="truncate font-semibold text-foreground">{theme}</strong>
      <motion.span
        aria-hidden
        className="pointer-events-none absolute inset-y-0 -left-1/3 w-1/3 bg-gradient-to-r from-transparent via-white/20 to-transparent"
        initial={{ x: "0%" }}
        animate={{ x: "450%" }}
        transition={{ duration: 1.4, ease: "easeInOut", delay: 0.5 }}
      />
    </motion.div>
  );
}

/** The big "X wins!" / "Tie!" moment at the top of a revealed round. */
export function ResultBanner({ kind, children }: { kind: "win" | "tie"; children: React.ReactNode }) {
  const Icon = kind === "win" ? Crown : Swords;
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.85, y: 10 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 260, damping: 18, delay: 0.15 }}
      className={cn(
        "relative flex items-center gap-3 overflow-hidden rounded-xl border px-4 py-3 text-base font-semibold sm:text-lg",
        kind === "win"
          ? "border-gold/40 bg-gradient-to-r from-gold/15 via-primary/20 to-fuchsia-500/15 glow"
          : "border-warning/40 bg-warning/10 text-warning",
      )}
    >
      <motion.span
        initial={{ rotate: -30, scale: 0 }}
        animate={{ rotate: 0, scale: 1 }}
        transition={{ type: "spring", stiffness: 300, damping: 12, delay: 0.35 }}
        className={cn(
          "grid size-9 shrink-0 place-items-center rounded-full",
          kind === "win" ? "bg-gold/20 text-gold" : "bg-warning/20",
        )}
      >
        <Icon className="size-5" />
      </motion.span>
      <span>{children}</span>
    </motion.div>
  );
}

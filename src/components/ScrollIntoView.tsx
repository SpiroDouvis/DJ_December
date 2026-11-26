"use client";

import { useEffect, useRef } from "react";

/** Brings its content into view when it first appears, unless it's already on screen. */
export function ScrollIntoView({ children }: { children: React.ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const top = el.getBoundingClientRect().top;
    if (top > window.innerHeight * 0.6 || top < 0) {
      el.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, []);
  return (
    <div ref={ref} className="scroll-mt-24">
      {children}
    </div>
  );
}

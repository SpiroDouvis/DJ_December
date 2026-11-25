"use client";

import { useEffect } from "react";
import confetti from "canvas-confetti";

const colors = ["#a855f7", "#c084fc", "#7c3aed", "#d946ef", "#e9d5ff", "#facc15"];

/**
 * Rains purple confetti when a day's winner is shown. Fires once per browser for
 * each result (keyed by `id`), so refreshing the page doesn't set it off again.
 */
export function WinConfetti({ id }: { id: string }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const key = `dj-confetti:${id}`;
    try {
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
    } catch {
      // Storage blocked: just celebrate every time.
    }

    const end = Date.now() + 2500;
    let frame = 0;
    const burst = () => {
      confetti({ particleCount: 140, spread: 100, startVelocity: 45, origin: { y: 0.35 }, colors });
    };
    const rain = () => {
      confetti({ particleCount: 4, angle: 60, spread: 60, origin: { x: 0, y: 0.6 }, colors });
      confetti({ particleCount: 4, angle: 120, spread: 60, origin: { x: 1, y: 0.6 }, colors });
      confetti({
        particleCount: 3,
        startVelocity: 0,
        ticks: 300,
        gravity: 0.8,
        origin: { x: Math.random(), y: -0.05 },
        colors,
      });
      if (Date.now() < end) frame = requestAnimationFrame(rain);
    };
    const timer = setTimeout(() => {
      burst();
      rain();
    }, 400);
    return () => {
      clearTimeout(timer);
      cancelAnimationFrame(frame);
    };
  }, [id]);
  return null;
}

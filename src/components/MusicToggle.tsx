"use client";

import { useEffect, useRef, useState } from "react";
import { Music, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";

/** Original ambient piano pieces made for DJ December (see public/music/CREDITS.md). */
const TRACKS = ["/music/snowfall.mp3", "/music/hearth.mp3", "/music/lanterns.mp3"];
const STORAGE_KEY = "dj-music";
const VOLUME = 0.35;

function readPref(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

function writePref(on: boolean) {
  try {
    localStorage.setItem(STORAGE_KEY, on ? "on" : "off");
  } catch {
    // Private mode or blocked storage: the toggle still works for this visit.
  }
}

function shuffled<T>(items: T[]): T[] {
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * Background music on/off button. Browsers only allow sound after the person interacts with
 * the page, so when music was left on last visit it starts on their first click or key press.
 */
export function MusicToggle() {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const queueRef = useRef<string[]>([]);
  const fadeRef = useRef<number | null>(null);
  const [on, setOn] = useState(false);

  function audio() {
    if (!audioRef.current) {
      const el = new Audio();
      el.preload = "auto";
      el.volume = 0;
      el.addEventListener("ended", () => {
        el.src = nextTrack();
        void el.play().catch(() => {});
      });
      audioRef.current = el;
    }
    return audioRef.current;
  }

  function nextTrack() {
    if (queueRef.current.length === 0) queueRef.current = shuffled(TRACKS);
    return queueRef.current.shift()!;
  }

  function fadeTo(target: number, then?: () => void) {
    const el = audio();
    if (fadeRef.current) window.clearInterval(fadeRef.current);
    fadeRef.current = window.setInterval(() => {
      const step = 0.02;
      const v = el.volume;
      if (Math.abs(v - target) <= step) {
        el.volume = target;
        if (fadeRef.current) window.clearInterval(fadeRef.current);
        fadeRef.current = null;
        then?.();
      } else {
        el.volume = Math.min(1, Math.max(0, v + (target > v ? step : -step)));
      }
    }, 50);
  }

  async function start(): Promise<boolean> {
    const el = audio();
    if (!el.src) el.src = nextTrack();
    try {
      await el.play();
      fadeTo(VOLUME);
      return true;
    } catch {
      return false;
    }
  }

  function stop() {
    fadeTo(0, () => audioRef.current?.pause());
  }

  // Resume if music was on last time: try now, otherwise on the first interaction.
  useEffect(() => {
    if (!readPref()) return;
    setOn(true);
    let done = false;
    const onInteract = (e: Event) => {
      // Clicking the toggle itself is handled by toggle(); a turned-off preference wins too.
      if (done || (e.target as Element | null)?.closest?.("[data-music-toggle]") || !readPref()) return;
      void start().then((ok) => {
        if (ok) {
          done = true;
          cleanup();
        }
      });
    };
    const cleanup = () => {
      window.removeEventListener("pointerdown", onInteract);
      window.removeEventListener("keydown", onInteract);
    };
    void start().then((ok) => {
      if (ok) done = true;
      else {
        window.addEventListener("pointerdown", onInteract);
        window.addEventListener("keydown", onInteract);
      }
    });
    return () => {
      cleanup();
      if (fadeRef.current) window.clearInterval(fadeRef.current);
      audioRef.current?.pause();
    };
  }, []);

  function toggle() {
    const next = !on;
    setOn(next);
    writePref(next);
    if (next) void start();
    else stop();
  }

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={toggle}
      data-music-toggle
      aria-pressed={on}
      aria-label={on ? "Turn music off" : "Turn music on"}
      title={on ? "Music on" : "Music off"}
      className={on ? "text-primary" : "text-muted-foreground"}
    >
      {on ? <Music /> : <VolumeX />}
      <span className="hidden sm:inline">Music</span>
    </Button>
  );
}

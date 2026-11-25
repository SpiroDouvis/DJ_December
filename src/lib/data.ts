import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { authClient, dataClient } from "./supabase/server";
import { adminEmails } from "./supabase/env";
import type { Player, Rating, Submission } from "./game";
import type { Service } from "./music";
import { availabilityKey, type Availability } from "./schedule";
import { datesNeedingDraw, drawTheme, type DayThemeRow, type ThemeRow } from "./themes";
import { gameDateOf, openDates, seasonFromEnv, type GameDate, type Season } from "./time";

export type PlayerRow = {
  id: string;
  email: string;
  display_name: string;
  is_admin: boolean;
  service: Service;
  joined_on: string;
};

export type Song = {
  id: string;
  title: string;
  artist: string;
  artworkUrl: string | null;
  spotifyUrl: string | null;
  appleMusicUrl: string | null;
};

export type Me = PlayerRow;

/** The signed-in player. Sends anyone not on the player list away. */
export const requireMe = cache(async (): Promise<Me> => {
  const supabase = await authClient();
  const { data } = await supabase.auth.getClaims();
  const claims = data?.claims;
  const email = typeof claims?.email === "string" ? claims.email.toLowerCase() : null;
  if (!email) redirect("/login");

  const db = dataClient();
  const { data: row, error } = await db.from("players").select("*").eq("email", email).maybeSingle();
  if (error) throw error;

  const isBootstrapAdmin = adminEmails().includes(email);
  if (row) {
    if (isBootstrapAdmin && !row.is_admin) {
      await db.from("players").update({ is_admin: true }).eq("id", row.id);
      return { ...(row as PlayerRow), is_admin: true };
    }
    return row as PlayerRow;
  }
  if (!isBootstrapAdmin) redirect("/not-invited");

  // The first admin adds themselves on first sign-in.
  const meta = (claims?.user_metadata ?? {}) as Record<string, unknown>;
  const name = String(meta.full_name ?? meta.name ?? email.split("@")[0]).slice(0, 40);
  const season = seasonFromEnv();
  const today = gameDateOf(new Date());
  const { data: created, error: createError } = await db
    .from("players")
    .insert({ email, display_name: name, is_admin: true, joined_on: today < season.start ? season.start : today })
    .select("*")
    .single();
  if (createError) throw createError;
  return created as PlayerRow;
});

export async function requireAdmin(): Promise<Me> {
  const me = await requireMe();
  if (!me.is_admin) redirect("/");
  return me;
}

export type Game = {
  season: Season;
  today: GameDate;
  open: GameDate[];
  players: Player[];
  playerRows: PlayerRow[];
  submissions: Submission[];
  ratings: Rating[];
  songs: Map<string, Song>;
  /** Themes of days that have opened. Days without a theme aren't in it. */
  themes: Map<GameDate, string>;
  /** Every saved day theme, including future ones an admin set. Not for players' eyes. */
  dayThemeRows: Map<GameDate, DayThemeRow>;
  themePool: ThemeRow[];
  /** Keyed by availabilityKey(playerId, date). */
  availability: Map<string, Availability>;
};

async function loadDayThemes(): Promise<Map<GameDate, DayThemeRow>> {
  const { data, error } = await dataClient().from("day_themes").select("game_date, theme_text, theme_id");
  if (error) throw error;
  return new Map(
    data.map((r) => [r.game_date, { date: r.game_date, text: r.theme_text, themeId: r.theme_id }]),
  );
}

/**
 * Draws the theme for any themed day that has opened without one. This runs on
 * page load, so the first visit after 5 AM MST picks the day's theme. If two
 * visits race, the database keeps whichever draw landed first.
 */
async function drawDueThemes(
  season: Season,
  open: GameDate[],
  pool: ThemeRow[],
  saved: Map<GameDate, DayThemeRow>,
): Promise<Map<GameDate, DayThemeRow>> {
  const due = datesNeedingDraw(season, open, saved);
  if (due.length === 0) return saved;
  const picked = [...saved.values()];
  const rows = [];
  for (const date of due) {
    const theme = drawTheme(pool, picked);
    if (!theme) break;
    const row = { date, text: theme.text, themeId: theme.id };
    picked.push(row);
    rows.push({ game_date: date, theme_text: theme.text, theme_id: theme.id });
  }
  if (rows.length === 0) return saved;
  const { error } = await dataClient()
    .from("day_themes")
    .upsert(rows, { onConflict: "game_date", ignoreDuplicates: true });
  if (error) throw error;
  return loadDayThemes();
}

/** Everything in the game. A season is at most a few thousand rows, so we load it all. */
export async function loadGame(): Promise<Game> {
  const db = dataClient();
  const [players, submissions, ratings, songs, pool, savedThemes, availability] = await Promise.all([
    db.from("players").select("*").order("display_name"),
    db.from("submissions").select("id, player_id, game_date, round, song_id"),
    db.from("ratings").select("submission_id, rater_id, score"),
    db.from("songs").select("id, title, artist, artwork_url, spotify_url, apple_music_url"),
    db.from("themes").select("id, text, submitted_by, created_at").order("created_at", { ascending: false }),
    loadDayThemes(),
    db.from("availability").select("player_id, game_date, status, note"),
  ]);
  if (pool.error) throw pool.error;
  if (availability.error) throw availability.error;
  for (const r of [players, submissions, ratings, songs]) if (r.error) throw r.error;

  const season = seasonFromEnv();
  const today = gameDateOf(new Date());
  const playerRows = players.data as PlayerRow[];
  const open = openDates(season, today);
  const themePool: ThemeRow[] = pool.data.map((t) => ({
    id: t.id,
    text: t.text,
    submittedBy: t.submitted_by,
    createdAt: t.created_at,
  }));
  const dayThemeRows = await drawDueThemes(season, open, themePool, savedThemes);
  const themes = new Map<GameDate, string>();
  for (const d of open) {
    const text = dayThemeRows.get(d)?.text;
    if (text) themes.set(d, text);
  }
  return {
    season,
    today,
    open,
    themes,
    dayThemeRows,
    themePool,
    availability: new Map(
      availability.data.map((a) => [
        availabilityKey(a.player_id, a.game_date),
        { status: a.status, note: a.note },
      ]),
    ),
    playerRows,
    players: playerRows.map((p) => ({ id: p.id, name: p.display_name, joinedOn: p.joined_on })),
    submissions: submissions.data!.map((s) => ({
      id: s.id,
      playerId: s.player_id,
      date: s.game_date,
      round: s.round,
      songId: s.song_id,
    })),
    ratings: ratings.data!.map((r) => ({
      submissionId: r.submission_id,
      raterId: r.rater_id,
      score: Number(r.score),
    })),
    songs: new Map(
      songs.data!.map((s) => [
        s.id,
        {
          id: s.id,
          title: s.title,
          artist: s.artist,
          artworkUrl: s.artwork_url,
          spotifyUrl: s.spotify_url,
          appleMusicUrl: s.apple_music_url,
        },
      ]),
    ),
  };
}

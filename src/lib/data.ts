import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { authClient, dataClient } from "./supabase/server";
import { adminEmails } from "./supabase/env";
import type { Player, Rating, Submission } from "./game";
import type { Service } from "./music";
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
};

/** Everything in the game. A season is at most a few thousand rows, so we load it all. */
export async function loadGame(): Promise<Game> {
  const db = dataClient();
  const [players, submissions, ratings, songs] = await Promise.all([
    db.from("players").select("*").order("display_name"),
    db.from("submissions").select("id, player_id, game_date, song_id"),
    db.from("ratings").select("submission_id, rater_id, score"),
    db.from("songs").select("id, title, artist, artwork_url, spotify_url, apple_music_url"),
  ]);
  for (const r of [players, submissions, ratings, songs]) if (r.error) throw r.error;

  const season = seasonFromEnv();
  const today = gameDateOf(new Date());
  const playerRows = players.data as PlayerRow[];
  return {
    season,
    today,
    open: openDates(season, today),
    playerRows,
    players: playerRows.map((p) => ({ id: p.id, name: p.display_name, joinedOn: p.joined_on })),
    submissions: submissions.data!.map((s) => ({
      id: s.id,
      playerId: s.player_id,
      date: s.game_date,
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

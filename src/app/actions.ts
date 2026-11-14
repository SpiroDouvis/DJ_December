"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { loadGame, requireAdmin, requireMe } from "@/lib/data";
import { dayStatus, isValidScore, owedDates } from "@/lib/game";
import { resolveSong, SongLinkError } from "@/lib/music";
import { authClient, dataClient } from "@/lib/supabase/server";
import { formatDate, isGameDate } from "@/lib/time";

export type FormState = { error?: string; ok?: string } | undefined;

export async function signInWithGoogle() {
  const supabase = await authClient();
  const h = await headers();
  const origin = h.get("origin") ?? `https://${h.get("host")}`;
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: { redirectTo: `${origin}/auth/callback` },
  });
  if (error || !data.url) redirect("/login?error=1");
  redirect(data.url);
}

export async function signOut() {
  const supabase = await authClient();
  await supabase.auth.signOut();
  redirect("/login");
}

export async function submitSong(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireMe();
  const date = String(form.get("date") ?? "");
  const link = String(form.get("link") ?? "");
  if (!isGameDate(date)) return { error: "Unknown day." };

  const game = await loadGame();
  const existing = game.submissions.find((s) => s.playerId === me.id && s.date === date);

  if (existing) {
    // Swapping a song is fine until anyone has rated it.
    if (game.ratings.some((r) => r.submissionId === existing.id)) {
      return { error: "Someone has already rated that song, so it can't be changed." };
    }
  } else {
    const owed = owedDates(me.id, game.open, game.players, game.submissions);
    if (!owed.includes(date)) return { error: `You can't send a song for ${formatDate(date)}.` };
    if (owed[0] !== date) {
      return { error: `Send your song for ${formatDate(owed[0])} first.` };
    }
  }

  let song;
  try {
    song = await resolveSong(link);
  } catch (e) {
    if (e instanceof SongLinkError) return { error: e.message };
    throw e;
  }

  const db = dataClient();
  const { data: saved, error: songError } = await db
    .from("songs")
    .upsert(
      {
        song_key: song.key,
        title: song.title,
        artist: song.artist,
        artwork_url: song.artworkUrl,
        spotify_url: song.spotifyUrl,
        apple_music_url: song.appleMusicUrl,
      },
      { onConflict: "song_key" },
    )
    .select("id")
    .single();
  if (songError) throw songError;

  const { error } = existing
    ? await db.from("submissions").update({ song_id: saved.id }).eq("id", existing.id)
    : await db.from("submissions").insert({ player_id: me.id, game_date: date, song_id: saved.id });
  if (error) {
    if (error.code === "23505") return { error: "You've already sent a song for that day." };
    throw error;
  }

  revalidatePath("/", "layout");
  return { ok: `Sent "${song.title}" for ${formatDate(date)}.` };
}

export async function rateSong(form: FormData) {
  const me = await requireMe();
  const submissionId = String(form.get("submissionId") ?? "");
  const score = Number(form.get("score"));
  if (!isValidScore(score)) throw new Error("Scores run from 1 to 10 in half points.");

  const game = await loadGame();
  const submission = game.submissions.find((s) => s.id === submissionId);
  if (!submission) throw new Error("That song isn't in the game.");
  if (submission.playerId === me.id) throw new Error("You can't rate your own song.");
  const status = dayStatus(submission.date, game.players, game.submissions, game.ratings);
  if (!status.players.some((p) => p.id === me.id)) throw new Error("You weren't playing that day.");
  if (status.revealed) throw new Error("That day's results are already out.");

  const { error } = await dataClient()
    .from("ratings")
    .upsert(
      { submission_id: submissionId, rater_id: me.id, score },
      { onConflict: "submission_id,rater_id" },
    );
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function setService(form: FormData) {
  const me = await requireMe();
  const service = form.get("service") === "apple" ? "apple" : "spotify";
  const { error } = await dataClient().from("players").update({ service }).eq("id", me.id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function addPlayer(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const joinedOn = String(form.get("joinedOn") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter an email address." };
  if (!name || name.length > 40) return { error: "Enter a name up to 40 characters." };
  if (!isGameDate(joinedOn)) return { error: "Pick the first day they play." };

  const { error } = await dataClient()
    .from("players")
    .insert({ email, display_name: name, joined_on: joinedOn });
  if (error) {
    if (error.code === "23505") return { error: "That email is already playing." };
    throw error;
  }
  revalidatePath("/", "layout");
  return { ok: `Added ${name}. They can sign in with Google using ${email}.` };
}

export async function removePlayer(form: FormData) {
  const me = await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id === me.id) throw new Error("You can't remove yourself.");
  const { error } = await dataClient().from("players").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

export async function setAdmin(form: FormData) {
  const me = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const isAdmin = form.get("isAdmin") === "true";
  if (id === me.id && !isAdmin) throw new Error("You can't remove your own admin access.");
  const { error } = await dataClient().from("players").update({ is_admin: isAdmin }).eq("id", id);
  if (error) throw error;
  revalidatePath("/", "layout");
}

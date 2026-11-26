"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { gameClock, gameDb, loadGame, requireAdmin, requireMe } from "@/lib/data";
import { dayOutcome, isValidScore, owedDates } from "@/lib/game";
import { resolveSong, SongLinkError } from "@/lib/music";
import { gameChanged } from "@/lib/live";
import { authClient } from "@/lib/supabase/server";
import { queueBlocker } from "@/lib/schedule";
import { drawTheme } from "@/lib/themes";
import { formatDate, isGameDate, seasonDates } from "@/lib/time";

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
  const round = Number(form.get("round") ?? 1);
  const link = String(form.get("link") ?? "");
  if (!isGameDate(date)) return { error: "Unknown day." };
  if (!Number.isInteger(round) || round < 1) return { error: "Unknown round." };

  const game = await loadGame();
  const existing = game.submissions.find(
    (s) => s.playerId === me.id && s.date === date && s.round === round,
  );

  if (existing) {
    // Swapping a song is fine until anyone has rated it.
    if (game.ratings.some((r) => r.submissionId === existing.id)) {
      return { error: "Someone has already rated that song, so it can't be changed." };
    }
  } else if (round === 1 && date > game.today) {
    const blocker = queueBlocker(date, game.today, game.season, me.joined_on);
    if (blocker) return { error: blocker };
  } else if (round === 1) {
    const owed = owedDates(me.id, game.open, game.players, game.submissions);
    if (!owed.includes(date)) return { error: `You can't send a song for ${formatDate(date)}.` };
    if (owed[0] !== date) {
      return { error: `Send your song for ${formatDate(owed[0])} first.` };
    }
  } else {
    if (!game.open.includes(date)) return { error: "Unknown day." };
    const current = dayOutcome(date, game.players, game.submissions, game.ratings).current;
    if (current.round !== round || !current.submitters.some((p) => p.id === me.id)) {
      return { error: `You're not in that tiebreak.` };
    }
  }

  let song;
  try {
    song = await resolveSong(link);
  } catch (e) {
    if (e instanceof SongLinkError) return { error: e.message };
    throw e;
  }

  const db = await gameDb();
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
    : await db
        .from("submissions")
        .insert({ player_id: me.id, game_date: date, round, song_id: saved.id });
  if (error) {
    if (error.code === "23505") return { error: "You've already sent a song for that day." };
    throw error;
  }

  await gameChanged();
  const what =
    round > 1
      ? `the ${formatDate(date)} tiebreak`
      : date > game.today
        ? `${formatDate(date)}. It goes in when the day opens`
        : formatDate(date);
  return { ok: `Sent "${song.title}" for ${what}.` };
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
  const outcome = dayOutcome(submission.date, game.players, game.submissions, game.ratings);
  const status = outcome.rounds.find((r) => r.round === submission.round);
  if (!status) throw new Error("That round isn't being played.");
  if (!status.raters.some((p) => p.id === me.id)) throw new Error("You don't rate this round.");
  if (status.revealed) throw new Error("That round's results are already out.");

  const { error } = await (await gameDb())
    .from("ratings")
    .upsert(
      { submission_id: submissionId, rater_id: me.id, score },
      { onConflict: "submission_id,rater_id" },
    );
  if (error) throw error;
  await gameChanged();
}

export async function setService(form: FormData) {
  const me = await requireMe();
  const service = form.get("service") === "apple" ? "apple" : "spotify";
  const { error } = await (await gameDb()).from("players").update({ service }).eq("id", me.id);
  if (error) throw error;
  await gameChanged();
}

export async function addPlayer(_prev: FormState, form: FormData): Promise<FormState> {
  await requireAdmin();
  const email = String(form.get("email") ?? "").trim().toLowerCase();
  const name = String(form.get("name") ?? "").trim();
  const joinedOn = String(form.get("joinedOn") ?? "");
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "Enter an email address." };
  if (!name || name.length > 40) return { error: "Enter a name up to 40 characters." };
  if (!isGameDate(joinedOn)) return { error: "Pick the first day they play." };

  const { error } = await (await gameDb())
    .from("players")
    .insert({ email, display_name: name, joined_on: joinedOn });
  if (error) {
    if (error.code === "23505") return { error: "That email is already playing." };
    throw error;
  }
  await gameChanged();
  return { ok: `Added ${name}. They can sign in with Google using ${email}.` };
}

export async function removePlayer(form: FormData) {
  const me = await requireAdmin();
  const id = String(form.get("id") ?? "");
  if (id === me.id) throw new Error("You can't remove yourself.");
  const { error } = await (await gameDb()).from("players").delete().eq("id", id);
  if (error) throw error;
  await gameChanged();
}

export async function setAdmin(form: FormData) {
  const me = await requireAdmin();
  const id = String(form.get("id") ?? "");
  const isAdmin = form.get("isAdmin") === "true";
  if (id === me.id && !isAdmin) throw new Error("You can't remove your own admin access.");
  const { error } = await (await gameDb()).from("players").update({ is_admin: isAdmin }).eq("id", id);
  if (error) throw error;
  await gameChanged();
}

const themeText = (value: FormDataEntryValue | null) => String(value ?? "").trim().slice(0, 80);

/** Any player can add theme ideas to the pool. */
export async function addTheme(_prev: FormState, form: FormData): Promise<FormState> {
  const me = await requireMe();
  const text = themeText(form.get("text"));
  if (!text) return { error: "Type a theme idea." };
  const { error } = await (await gameDb()).from("themes").insert({ text, submitted_by: me.id });
  if (error) {
    if (error.code === "23505") return { error: "That idea is already in the pool." };
    throw error;
  }
  await gameChanged();
  return { ok: `Added "${text}".` };
}

/** Players can take back their own ideas until one is used; admins can remove any. */
export async function removeTheme(form: FormData) {
  const me = await requireMe();
  const id = String(form.get("id") ?? "");
  const db = await gameDb();
  if (!me.is_admin) {
    const { data: theme, error } = await db.from("themes").select("submitted_by").eq("id", id).maybeSingle();
    if (error) throw error;
    if (!theme || theme.submitted_by !== me.id) throw new Error("You can only remove your own ideas.");
    const { count, error: usedError } = await db
      .from("day_themes")
      .select("game_date", { count: "exact", head: true })
      .eq("theme_id", id);
    if (usedError) throw usedError;
    if (count) throw new Error("That idea has already been picked for a day.");
  }
  const { error } = await db.from("themes").delete().eq("id", id);
  if (error) throw error;
  await gameChanged();
}

type ThemeChoice =
  | { kind: "idea"; id: string }
  | { kind: "random" }
  | { kind: "custom"; text: string }
  | { kind: "none" };

/**
 * Gives a day a theme (an idea from the pool, a random unused idea, or custom
 * text) or takes its theme away. Only admins can. Songs already queued for a day
 * that hasn't opened were picked for its old theme, so a new theme drops them.
 */
async function applyDayTheme(date: string, choice: ThemeChoice): Promise<FormState> {
  await requireAdmin();
  if (!isGameDate(date)) return { error: "Unknown day." };
  const game = await loadGame();
  if (!seasonDates(game.season).includes(date)) return { error: "That day isn't part of the season." };
  const db = await gameDb();

  let row: { theme_text: string; theme_id: string | null } | null;
  if (choice.kind === "none") {
    row = null;
  } else if (choice.kind === "idea") {
    const idea = game.themePool.find((t) => t.id === choice.id);
    if (!idea) return { error: "That idea isn't in the pool any more." };
    row = { theme_text: idea.text, theme_id: idea.id };
  } else if (choice.kind === "random") {
    // Counting this day's current theme as used means a redraw gives a different one.
    const idea = drawTheme(game.themePool, game.dayThemeRows.values());
    if (!idea) return { error: "The theme pool is empty. Players can add ideas on the Ideas page." };
    row = { theme_text: idea.text, theme_id: idea.id };
  } else {
    const text = themeText(choice.text);
    if (!text) return { error: "Type a theme." };
    row = { theme_text: text, theme_id: null };
  }

  const before = game.themes.get(date) ?? null;
  const { error } = row
    ? await db.from("day_themes").upsert({ game_date: date, ...row }, { onConflict: "game_date" })
    : await db.from("day_themes").delete().eq("game_date", date);
  if (error) throw error;

  let dropped = 0;
  if (row && row.theme_text !== before && date > game.today) {
    const { data, error: dropError } = await db
      .from("submissions")
      .delete()
      .eq("game_date", date)
      .eq("round", 1)
      .select("id");
    if (dropError) throw dropError;
    dropped = data.length;
  }
  await gameChanged();
  const what = row ? `${formatDate(date)} is now "${row.theme_text}".` : `${formatDate(date)} has no theme now.`;
  return {
    ok: dropped
      ? `${what} ${dropped} queued ${dropped === 1 ? "song was" : "songs were"} removed.`
      : what,
  };
}

/** The theme picker form on a calendar day. */
export async function setDayTheme(_prev: FormState, form: FormData): Promise<FormState> {
  const date = String(form.get("date") ?? "");
  const pick = String(form.get("pick") ?? "");
  if (pick === "none") return applyDayTheme(date, { kind: "none" });
  if (pick === "random") return applyDayTheme(date, { kind: "random" });
  if (pick === "custom") return applyDayTheme(date, { kind: "custom", text: String(form.get("text") ?? "") });
  if (pick.startsWith("idea:")) return applyDayTheme(date, { kind: "idea", id: pick.slice(5) });
  return { error: "Pick a theme." };
}

/** Dropping an idea onto a calendar day. */
export async function assignIdea(date: string, ideaId: string): Promise<FormState> {
  return applyDayTheme(String(date), { kind: "idea", id: String(ideaId) });
}

/** Dragging a theme off a calendar day. */
export async function clearDayTheme(date: string): Promise<FormState> {
  return applyDayTheme(String(date), { kind: "none" });
}

export async function removeQueuedSong(form: FormData) {
  const me = await requireMe();
  const date = String(form.get("date") ?? "");
  if (!isGameDate(date) || date <= (await gameClock()).today) {
    throw new Error("Only songs for days that haven't opened can be removed.");
  }
  const { error } = await (await gameDb())
    .from("submissions")
    .delete()
    .eq("player_id", me.id)
    .eq("game_date", date)
    .eq("round", 1);
  if (error) throw error;
  await gameChanged();
}

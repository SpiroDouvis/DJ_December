"use server";

// Admin test rounds. Everything here writes only to the sandbox schema, never to
// the real game's tables.

import { randomInt } from "node:crypto";
import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";
import type { FormState } from "@/app/actions";
import { loadGame, requireRealAdmin, testRound, TEST_COOKIE } from "@/lib/data";
import {
  FAKE_NAMES,
  MAX_TEST_DAYS,
  MAX_TEST_PLAYERS,
  planRatings,
  planSongs,
  simulatedScore,
  testSongRow,
  TEST_SONGS,
  type ScoreMode,
} from "@/lib/sandbox";
import { dataClient } from "@/lib/supabase/server";
import { addDays, formatDate, isGameDate } from "@/lib/time";

const sandbox = () => dataClient("sandbox");

async function setTestCookie(on: boolean) {
  const store = await cookies();
  if (on) {
    store.set(TEST_COOKIE, "1", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 14,
    });
  } else {
    store.delete(TEST_COOKIE);
  }
}

const SETUP_HINT =
  'Run the test sandbox migration in the Supabase SQL editor, then add "sandbox" to the exposed schemas under Project Settings > Data API.';

/** Wipes the sandbox and starts a new test round with fake players. */
export async function startTestRound(_prev: FormState, form: FormData): Promise<FormState> {
  const real = await requireRealAdmin();
  const others = Number(form.get("players") ?? 3);
  const days = Number(form.get("days") ?? 6);
  const start = String(form.get("start") ?? "");
  const copyIdeas = form.get("copyIdeas") === "on";
  if (!Number.isInteger(others) || others < 1 || others > MAX_TEST_PLAYERS - 1) {
    return { error: `Pick 1 to ${MAX_TEST_PLAYERS - 1} other players.` };
  }
  if (!Number.isInteger(days) || days < 1 || days > MAX_TEST_DAYS) {
    return { error: `Pick 1 to ${MAX_TEST_DAYS} days.` };
  }
  if (!isGameDate(start)) return { error: "Pick the test season's first day." };

  const db = sandbox();
  const { error: resetError } = await db.rpc("reset");
  if (resetError) return { error: `Couldn't reach the test sandbox (${resetError.message}). ${SETUP_HINT}` };

  // Fake players borrow real players' names where there are some, so the test
  // looks like the real game. They get made-up emails, so nobody can sign in as them.
  const { data: realPlayers, error: playersError } = await dataClient()
    .from("players")
    .select("id, display_name")
    .neq("id", real.id)
    .order("display_name");
  if (playersError) throw playersError;
  const fakes = Array.from({ length: others }, (_, i) => {
    const borrowed = realPlayers[i];
    return {
      realId: borrowed?.id ?? null,
      email: `test-player-${i + 1}@sandbox.invalid`,
      display_name: borrowed ? `${borrowed.display_name} (test)`.slice(0, 40) : FAKE_NAMES[i],
      is_admin: false,
      joined_on: start,
    };
  });

  const { data: created, error: createError } = await db
    .from("players")
    .insert([
      {
        email: real.email,
        display_name: real.display_name,
        is_admin: true,
        service: real.service,
        joined_on: start,
      },
      ...fakes.map((f) => ({ email: f.email, display_name: f.display_name, is_admin: f.is_admin, joined_on: f.joined_on })),
    ])
    .select("id, email");
  if (createError) throw createError;
  const sandboxIdOf = new Map<string, string>();
  for (const row of created) {
    if (row.email === real.email) sandboxIdOf.set(real.id, row.id);
    const fake = fakes.find((f) => f.email === row.email);
    if (fake?.realId) sandboxIdOf.set(fake.realId, row.id);
  }

  if (copyIdeas) {
    // Copies, so drawing them in the test never marks a real idea as used.
    const { data: ideas, error: ideasError } = await dataClient().from("themes").select("text, submitted_by");
    if (ideasError) throw ideasError;
    if (ideas.length > 0) {
      const { error } = await db.from("themes").insert(
        ideas.map((t) => ({
          text: t.text,
          submitted_by: t.submitted_by ? (sandboxIdOf.get(t.submitted_by) ?? null) : null,
        })),
      );
      if (error) throw error;
    }
  }

  const { error: settingsError } = await db
    .from("settings")
    .insert({ today: start, season_start: start, season_days: days, acting_as: null });
  if (settingsError) throw settingsError;

  await setTestCookie(true);
  revalidatePath("/", "layout");
  return { ok: `Test round started: ${days} days from ${formatDate(start)} with ${others + 1} players.` };
}

/** Back to the real game. The test round stays saved. */
export async function leaveTestMode() {
  await requireRealAdmin();
  await setTestCookie(false);
  revalidatePath("/", "layout");
}

export async function resumeTestMode() {
  await requireRealAdmin();
  await setTestCookie(true);
  revalidatePath("/", "layout");
}

/** Deletes everything in the sandbox and goes back to the real game. */
export async function wipeTestRound() {
  await requireRealAdmin();
  const { error } = await sandbox().rpc("reset");
  if (error) throw new Error(`Couldn't reach the test sandbox (${error.message}). ${SETUP_HINT}`);
  await setTestCookie(false);
  revalidatePath("/", "layout");
}

async function requireTestRound() {
  await requireRealAdmin();
  const round = await testRound();
  if (!round) throw new Error("No test round is running. Start one on the Test page.");
  return round;
}

/** Moves the test round's clock: next day, previous day, or a chosen day. */
export async function setTestDay(form: FormData) {
  const round = await requireTestRound();
  const mode = String(form.get("mode") ?? "");
  const first = addDays(round.season.start, -1);
  const last = addDays(round.season.start, round.season.days - 1);
  let today =
    mode === "next" ? addDays(round.today, 1) : mode === "prev" ? addDays(round.today, -1) : String(form.get("date") ?? "");
  if (!isGameDate(today)) throw new Error("Pick a day.");
  if (today < first) today = first;
  if (today > last) today = last;
  const { error } = await sandbox().from("settings").update({ today }).eq("id", true);
  if (error) throw error;
  revalidatePath("/", "layout");
}

/** Plays the test round as another sandbox player. */
export async function actAs(form: FormData) {
  await requireTestRound();
  const id = String(form.get("id") ?? "");
  const { data, error } = await sandbox().from("players").select("id").eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new Error("That player isn't in the test round.");
  const { error: updateError } = await sandbox().from("settings").update({ acting_as: id }).eq("id", true);
  if (updateError) throw updateError;
  revalidatePath("/", "layout");
}

/**
 * Has players send the songs they owe and/or rate the songs waiting on them,
 * on every day that has opened in the test round.
 */
export async function simulate(_prev: FormState, form: FormData): Promise<FormState> {
  const round = await requireTestRound();
  const who = String(form.get("who") ?? "others");
  const what = String(form.get("what") ?? "both");
  const mode: ScoreMode = form.get("scores") === "same" ? "same" : "random";
  const db = sandbox();

  let game = await loadGame();
  const meId =
    round.actingAs ?? game.playerRows.find((p) => p.is_admin && !p.email.endsWith("@sandbox.invalid"))?.id;
  const ids =
    who === "everyone"
      ? game.players.map((p) => p.id)
      : who === "others"
        ? game.players.filter((p) => p.id !== meId).map((p) => p.id)
        : game.players.filter((p) => p.id === who).map((p) => p.id);
  if (ids.length === 0) return { error: "Pick who to fill in for." };

  let songs = 0;
  let ratings = 0;
  if (what === "songs" || what === "both") {
    const planned = planSongs(ids, game.open, game.players, game.submissions, game.ratings);
    if (planned.length > 0) {
      const { data: songRows, error: songError } = await db
        .from("songs")
        .upsert(
          TEST_SONGS.map((_, i) => testSongRow(i)),
          { onConflict: "song_key" },
        )
        .select("id");
      if (songError) throw songError;
      const { error } = await db.from("submissions").insert(
        planned.map((p) => ({
          player_id: p.playerId,
          game_date: p.date,
          round: p.round,
          song_id: songRows[randomInt(songRows.length)].id,
        })),
      );
      if (error) throw error;
      songs = planned.length;
      game = await loadGame();
    }
  }
  if (what === "ratings" || what === "both") {
    const planned = planRatings(ids, game.open, game.players, game.submissions, game.ratings);
    if (planned.length > 0) {
      const { error } = await db.from("ratings").insert(
        planned.map((p) => ({ submission_id: p.submissionId, rater_id: p.raterId, score: simulatedScore(mode) })),
      );
      if (error) throw error;
      ratings = planned.length;
    }
  }

  revalidatePath("/", "layout");
  if (songs === 0 && ratings === 0) {
    return { ok: "Nothing to fill in: those players aren't owing any songs or ratings right now." };
  }
  const parts = [songs ? `${songs} ${songs === 1 ? "song" : "songs"}` : "", ratings ? `${ratings} ${ratings === 1 ? "rating" : "ratings"}` : ""];
  return { ok: `Filled in ${parts.filter(Boolean).join(" and ")}.` };
}


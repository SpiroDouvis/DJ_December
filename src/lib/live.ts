import "server-only";
import { revalidatePath } from "next/cache";
import { dataClient } from "./supabase/server";
import { testRound } from "./data";

/** The Realtime channel open pages listen on. Test rounds get their own. */
export const liveChannel = (inTestRound: boolean) => (inTestRound ? "dj-december-test" : "dj-december");

/**
 * Call after any change to the game. It refreshes this server's pages and tells
 * every open page, over Supabase Realtime, to fetch fresh data. The message only
 * says "something changed", so nothing secret goes over the public channel. A
 * Realtime hiccup never fails the change itself.
 */
export async function gameChanged() {
  revalidatePath("/", "layout");
  try {
    const db = dataClient();
    const channel = db.channel(liveChannel((await testRound()) !== null));
    await channel.httpSend("changed", { at: Date.now() }, { timeout: 3000 });
    await db.removeChannel(channel);
  } catch (e) {
    console.warn("Couldn't announce the change over Realtime:", e);
  }
}

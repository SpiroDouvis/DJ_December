# DJ December

A song a day, rated by your friends. Every day in December each player sends one
song, rates everyone else's from 1 to 10 (half points allowed), and the song with
the highest total wins the day.

## How a day works

- A day opens at **5:00 AM MST** and runs until 4:59 AM the next morning. All dates are MST (UTC-7).
- Paste a Spotify or Apple Music song link. The app finds the same song on the other
  service through [song.link](https://odesli.co), so everyone can listen on the service they use.
- Songs are anonymous until the day is revealed. You can rate songs as they arrive and
  change your rating until the reveal.
- There's no deadline. A day reveals once every player has sent a song and rated all the
  others. Until then, the page shows who it's waiting on.
- Miss a day and you owe that song. Late songs go in oldest day first, and each one
  belongs to the day it was missed.
- A tie for the top starts a tiebreak: the tied players each send another song and only
  the other players rate them. If everyone tied, the round repeats with everyone. Tiebreaks
  repeat until there's one winner.

- Themes come from the pool of ideas players add on the Ideas page. Admins assign them to
  days on the Calendar, by dragging ideas onto days or tapping a day and picking from a
  list. Only days an admin themes have a theme, and everyone can see them ahead of time.

- The Calendar tab shows the whole season and updates live. Days a player still owes a
  song or ratings for are outlined in red with a "!", and tapping one lets them catch up.
  Tapping a past day shows the winner and every rating; tapping a future day lets them
  queue a song for it (it goes in when the day opens). Giving a day a new theme drops
  songs already queued for it.

- The Stats tab shows wins, average ratings given and received, a grid of who rates whom,
  and each player's biggest fan and toughest critic. Only revealed days count.

## Stack

- [Next.js](https://nextjs.org) (App Router), deployed to Netlify or Vercel.
- [Supabase](https://supabase.com) for Postgres and Google sign-in.
- Pages listen on a public Supabase Realtime broadcast channel that only ever says
  "something changed", then re-fetch from the server.
- The browser never reads the database. Server code reads and writes with the secret
  key, and every table has row level security turned on with no public policies.

## Setup

1. **Supabase.** Create a free project, then run
   each file in [`supabase/migrations`](supabase/migrations) in the SQL editor, oldest first.
2. **Google sign-in.** In Supabase, go to Authentication > Sign In / Providers > Google and
   follow the steps there to create a Google OAuth client. Under Authentication > URL
   Configuration, set the Site URL to your site's address and add
   `https://<your-site>/auth/callback` (and `http://localhost:3000/auth/callback` for local
   development) to the redirect URLs.
3. **Environment variables.** Copy `.env.example` to `.env.local` and fill it in. Set the same
   variables on your host. Put your own email in `ADMIN_EMAILS`. You're added as an admin
   the first time you sign in, and you can then add the other players on the Admin page.
4. **Deploy.** Connect the GitHub repo to Netlify (or Vercel). Both detect Next.js automatically.

To run locally:

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # game rule tests
```

### Test rounds

Admins get a **Test** tab for playing a pretend game before the real one: pick how many fake
players and days, then move the clock a day at a time, switch which player you're playing as,
and have the others send songs and rate (randomly, or all 7s to force a tiebreak). Every page
shows the test game while you're in it, with a banner on top, and only for you.

Test rounds live in a separate `sandbox` schema, so they never touch real players, songs,
ratings, day themes or theme ideas (ideas are copied in, so drawing one in a test doesn't mark
the real one as used). To turn it on, run the `test_sandbox` migration and add `sandbox` to the
exposed schemas under Project Settings > Data API in Supabase.

To try a trial season before December, set `SEASON_START` (for example `2026-11-20`) and
`SEASON_DAYS`.

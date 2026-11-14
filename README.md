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

Coming in later updates: tiebreak rounds, themes, the schedule tab and stats.

## Stack

- [Next.js](https://nextjs.org) (App Router), deployed to Netlify or Vercel.
- [Supabase](https://supabase.com) for Postgres and Google sign-in.
- The browser never talks to the database. Server code reads and writes with the secret
  key, and every table has row level security turned on with no public policies.

## Setup

1. **Supabase.** Create a free project, then run
   [`supabase/migrations/20261114000000_core_game.sql`](supabase/migrations/20261114000000_core_game.sql)
   in the SQL editor.
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

To try a trial season before December, set `SEASON_START` (for example `2026-11-20`) and
`SEASON_DAYS`.

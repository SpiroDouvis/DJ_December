-- DJ December core game: players, songs, submissions and ratings.
-- The app reads and writes these tables only from the server, with the service
-- role key. Row level security is on with no policies, so the public anon key
-- can't read or change anything directly.

create table players (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  is_admin boolean not null default false,
  service text not null default 'spotify' check (service in ('spotify', 'apple')),
  -- The first game day this player takes part in.
  joined_on date not null,
  created_at timestamptz not null default now()
);

create table songs (
  id uuid primary key default gen_random_uuid(),
  -- song.link id, or SPOTIFY_SONG::id / ITUNES_SONG::id when it couldn't match.
  song_key text not null unique,
  title text not null,
  artist text not null default '',
  artwork_url text,
  spotify_url text,
  apple_music_url text,
  created_at timestamptz not null default now(),
  check (spotify_url is not null or apple_music_url is not null)
);

create table submissions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players (id) on delete cascade,
  game_date date not null,
  song_id uuid not null references songs (id),
  created_at timestamptz not null default now(),
  unique (player_id, game_date)
);

create index submissions_game_date on submissions (game_date);

create table ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references submissions (id) on delete cascade,
  rater_id uuid not null references players (id) on delete cascade,
  -- 1 to 10 in half points.
  score numeric(3, 1) not null check (score between 1 and 10 and score * 2 = floor(score * 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, rater_id)
);

-- Nobody rates their own song.
create function ratings_not_own_song() returns trigger
language plpgsql as $$
begin
  if exists (
    select 1 from submissions s where s.id = new.submission_id and s.player_id = new.rater_id
  ) then
    raise exception 'players cannot rate their own song' using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger ratings_not_own_song
  before insert or update on ratings
  for each row execute function ratings_not_own_song();

alter table players enable row level security;
alter table songs enable row level security;
alter table submissions enable row level security;
alter table ratings enable row level security;

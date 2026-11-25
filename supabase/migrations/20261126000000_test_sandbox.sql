-- Test rounds. An admin can play the whole game in a separate "sandbox" schema
-- with fake players and a clock they move by hand. The sandbox has its own copy
-- of every game table, so nothing done there touches the real game: no real
-- songs, ratings or day themes, and no real theme idea gets marked as used.
--
-- After running this file, add "sandbox" to the exposed schemas in Supabase:
-- Project Settings > Data API > Exposed schemas (some dashboards show it under
-- Integrations > Data API > Settings). Only the server's secret key can read or
-- write it, the same as the real tables.

create schema if not exists sandbox;

create table sandbox.players (
  id uuid primary key default gen_random_uuid(),
  email text not null unique check (email = lower(email)),
  display_name text not null check (length(trim(display_name)) between 1 and 40),
  is_admin boolean not null default false,
  service text not null default 'spotify' check (service in ('spotify', 'apple')),
  joined_on date not null,
  created_at timestamptz not null default now()
);

create table sandbox.songs (
  id uuid primary key default gen_random_uuid(),
  song_key text not null unique,
  title text not null,
  artist text not null default '',
  artwork_url text,
  spotify_url text,
  apple_music_url text,
  created_at timestamptz not null default now(),
  check (spotify_url is not null or apple_music_url is not null)
);

create table sandbox.submissions (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references sandbox.players (id) on delete cascade,
  game_date date not null,
  round smallint not null default 1 check (round >= 1),
  song_id uuid not null references sandbox.songs (id),
  created_at timestamptz not null default now(),
  unique (player_id, game_date, round)
);

create index submissions_game_date on sandbox.submissions (game_date);

create table sandbox.ratings (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references sandbox.submissions (id) on delete cascade,
  rater_id uuid not null references sandbox.players (id) on delete cascade,
  score numeric(3, 1) not null check (score between 1 and 10 and score * 2 = floor(score * 2)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (submission_id, rater_id)
);

create function sandbox.ratings_not_own_song() returns trigger
language plpgsql set search_path = '' as $$
begin
  if exists (
    select 1 from sandbox.submissions s where s.id = new.submission_id and s.player_id = new.rater_id
  ) then
    raise exception 'players cannot rate their own song' using errcode = 'check_violation';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create trigger ratings_not_own_song
  before insert or update on sandbox.ratings
  for each row execute function sandbox.ratings_not_own_song();

create table sandbox.themes (
  id uuid primary key default gen_random_uuid(),
  text text not null check (length(trim(text)) between 1 and 80),
  submitted_by uuid references sandbox.players (id) on delete set null,
  created_at timestamptz not null default now()
);

create unique index themes_text_lower on sandbox.themes (lower(trim(text)));

create table sandbox.day_themes (
  game_date date primary key,
  theme_text text check (theme_text is null or length(trim(theme_text)) between 1 and 80),
  theme_id uuid references sandbox.themes (id) on delete set null,
  created_at timestamptz not null default now()
);

create table sandbox.availability (
  player_id uuid not null references sandbox.players (id) on delete cascade,
  game_date date not null,
  status text not null check (status in ('available', 'busy')),
  note text check (note is null or length(note) <= 60),
  updated_at timestamptz not null default now(),
  primary key (player_id, game_date)
);

-- The test round's own clock and season, and which player the admin is playing as.
-- One row at most; no row means no test round is running.
create table sandbox.settings (
  id boolean primary key default true check (id),
  today date not null,
  season_start date not null,
  season_days int not null check (season_days between 1 and 31),
  acting_as uuid references sandbox.players (id) on delete set null
);

-- Wipes the whole sandbox.
create function sandbox.reset() returns void
language sql set search_path = '' as $$
  truncate sandbox.settings, sandbox.availability, sandbox.day_themes, sandbox.themes,
    sandbox.ratings, sandbox.submissions, sandbox.songs, sandbox.players;
$$;

alter table sandbox.players enable row level security;
alter table sandbox.songs enable row level security;
alter table sandbox.submissions enable row level security;
alter table sandbox.ratings enable row level security;
alter table sandbox.themes enable row level security;
alter table sandbox.day_themes enable row level security;
alter table sandbox.availability enable row level security;
alter table sandbox.settings enable row level security;

-- Only the server's secret key (the service_role) gets in.
revoke all on schema sandbox from public, anon, authenticated;
revoke all on all tables in schema sandbox from public, anon, authenticated;
revoke all on all functions in schema sandbox from public, anon, authenticated;
grant usage on schema sandbox to service_role;
grant all on all tables in schema sandbox to service_role;
grant execute on function sandbox.reset() to service_role;

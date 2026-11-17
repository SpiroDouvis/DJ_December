-- The schedule tab. Players mark days they're free or busy to rate, with an
-- optional note like "after 8pm". Queued songs need no new table: they are
-- submissions for days that haven't opened yet.

create table availability (
  player_id uuid not null references players (id) on delete cascade,
  game_date date not null,
  status text not null check (status in ('available', 'busy')),
  note text check (note is null or length(note) <= 60),
  updated_at timestamptz not null default now(),
  primary key (player_id, game_date)
);

alter table availability enable row level security;

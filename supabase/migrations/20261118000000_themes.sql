-- Themes. Every second day of the season is themed by default. When a themed day
-- opens at 5 AM MST, a theme is drawn at random from the pool (preferring ones
-- not used yet) and saved in day_themes. Admins can edit the pool and set,
-- redraw or clear any day's theme.

create table themes (
  id uuid primary key default gen_random_uuid(),
  text text not null unique check (length(trim(text)) between 1 and 80),
  created_at timestamptz not null default now()
);

create table day_themes (
  game_date date primary key,
  -- Null means the day is deliberately left without a theme.
  theme_text text check (theme_text is null or length(trim(theme_text)) between 1 and 80),
  theme_id uuid references themes (id) on delete set null,
  created_at timestamptz not null default now()
);

alter table themes enable row level security;
alter table day_themes enable row level security;

-- A starting pool. Edit it on the Admin page.
insert into themes (text) values
  ('A song from the year you were born'),
  ('Movie soundtrack'),
  ('One-hit wonder'),
  ('A cover better than the original'),
  ('Guilty pleasure'),
  ('Song with a colour in the title'),
  ('Not in English'),
  ('Winter or snow'),
  ('Road trip anthem'),
  ('A song from high school'),
  ('Video game music'),
  ('Under 2 minutes long'),
  ('Over 6 minutes long'),
  ('A duet or collaboration'),
  ('An artist from your home country'),
  ('Best opening 10 seconds'),
  ('Sad banger'),
  ('A song your parents love'),
  ('Instrumental only'),
  ('A number in the title'),
  ('Released this year'),
  ('Released before 1980'),
  ('Song you''d play at a party'),
  ('A sample you can recognise'),
  ('Christmas song that isn''t a classic');

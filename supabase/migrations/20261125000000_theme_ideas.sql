-- Player theme ideas. Any player can add ideas to the theme pool, and everyone
-- can see the whole pool with who suggested each one. The pool is now made only
-- of players' ideas, so the starting list from the themes migration is removed.
-- Themes already picked for a day keep their text in day_themes.

alter table themes
  add column submitted_by uuid references players (id) on delete set null;

-- The same idea in different capitals counts as a duplicate.
alter table themes drop constraint themes_text_key;
create unique index themes_text_lower on themes (lower(trim(text)));

-- Remove the preset themes (they have no submitter).
delete from themes where submitted_by is null;

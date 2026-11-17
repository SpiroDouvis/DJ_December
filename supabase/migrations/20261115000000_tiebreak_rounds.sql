-- Tiebreak rounds. Round 1 is a day's main round; a tie at the top starts
-- round 2, and so on. Each player sends at most one song per round.

alter table submissions
  add column round smallint not null default 1 check (round >= 1);

alter table submissions drop constraint submissions_player_id_game_date_key;
alter table submissions add constraint submissions_player_date_round_key
  unique (player_id, game_date, round);

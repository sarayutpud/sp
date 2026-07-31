-- One-shot: coach/officials columns on games.
-- Run once in Supabase SQL Editor on hosted, then you may delete this file.
-- schema.sql + baseline migration are updated to match.

alter table public.games
  add column if not exists home_coach text,
  add column if not exists away_coach text,
  add column if not exists crew_chief text,
  add column if not exists umpire text;

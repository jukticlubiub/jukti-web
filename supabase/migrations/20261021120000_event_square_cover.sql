-- A second, square (1:1) cover per event. cover_url stays the wide (16:9) one; the site shows
-- the square one where a square frame fits better (large screens), and the wide one elsewhere.
alter table public.events
  add column if not exists cover_square_url text check (cover_square_url is null or char_length(cover_square_url) <= 500);

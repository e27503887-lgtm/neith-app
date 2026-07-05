-- Adds outfit-scoped support to the existing comments/saves tables so the
-- /live feed can offer commenting and saving on outfits, not just products.
-- Run this once in the Supabase SQL editor.

alter table comments
  add column if not exists outfit_id bigint references outfits(id) on delete cascade;

alter table saves
  add column if not exists outfit_id bigint references outfits(id) on delete cascade;

create index if not exists idx_comments_outfit_id on comments (outfit_id);
create index if not exists idx_saves_outfit_id on saves (outfit_id);

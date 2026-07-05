-- Adds a single primary style tag per outfit, used by the "Stil Karnesi"
-- report in /intelligence. Run this once in the Supabase SQL editor.

alter table outfits
  add column if not exists style_tag text;

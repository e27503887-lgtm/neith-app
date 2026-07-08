-- Adds support for profile "Moda Kimliği" tags and per-outfit "Öne Çıkanlar" pinning.
-- Run this once in the Supabase SQL editor.

alter table profiles
  add column if not exists style_tags text[] not null default '{}',
  add column if not exists size_top text,
  add column if not exists size_bottom text,
  add column if not exists size_shoe integer,
  add column if not exists show_sizes boolean not null default true;

alter table outfits
  add column if not exists is_highlighted boolean not null default false;

-- Example RLS policy (Supabase) — allow a user to update only their own row.
-- Adapt to your project's existing policies if profiles/outfits already have
-- update policies in place.
-- create policy "update_own_profile" on profiles
--   for update using (auth.uid() = id);
-- create policy "update_own_outfit" on outfits
--   for update using (auth.uid() = user_id);

-- End of file

-- Creates tables for Fashion Week feature

-- Table: fashion_weeks
create table if not exists fashion_weeks (
  id bigserial primary key,
  title text not null,
  description text,
  cover_image_url text,
  starts_at timestamptz not null,
  ends_at timestamptz not null,
  created_at timestamptz default now()
);

-- Table: fashion_week_entries
create table if not exists fashion_week_entries (
  id bigserial primary key,
  week_id bigint not null references fashion_weeks(id) on delete cascade,
  outfit_id bigint not null references outfits(id) on delete cascade,
  user_id text not null,
  created_at timestamptz default now(),
  constraint uniq_entry unique (week_id, outfit_id)
);

create index if not exists idx_fwe_week_id on fashion_week_entries (week_id);
create index if not exists idx_fwe_outfit_id on fashion_week_entries (outfit_id);

-- Table: outfit_likes
create table if not exists outfit_likes (
  id bigserial primary key,
  outfit_id bigint not null references outfits(id) on delete cascade,
  user_id text not null,
  created_at timestamptz default now()
);

create index if not exists idx_outfit_likes_outfit_id on outfit_likes (outfit_id);
create index if not exists idx_outfit_likes_user_id on outfit_likes (user_id);

-- Example RLS policy (Supabase) for inserting into fashion_week_entries
-- Note: adapt role names and references to your project's auth/profile schema.
-- Enable RLS
-- alter table fashion_week_entries enable row level security;

-- Policy: allow insert only when authenticated user is the owner of the outfit
-- and the referenced fashion_week is currently active.
-- create policy "insert_by_owner_and_active_week" on fashion_week_entries
--   for insert using (
--     auth.role() = 'authenticated' AND
--     (
--       select user_id from outfits where outfits.id = new.outfit_id
--     ) = auth.uid() AND
--     (
--       select starts_at <= now() and ends_at >= now() from fashion_weeks where fashion_weeks.id = new.week_id
--     )
--   );

-- You should also add SELECT policies for fashion_weeks and fashion_week_entries as needed for public reading.

-- End of file

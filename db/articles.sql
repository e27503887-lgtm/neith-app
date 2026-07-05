-- Stores editorial articles shown on /editorial and managed from the admin
-- "Makaleler" tab. Run once in the Supabase SQL editor.

create extension if not exists pgcrypto;

create table if not exists articles (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  slug text not null unique,
  excerpt text,
  content text,
  cover_image_url text,
  category text,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

alter table articles enable row level security;

create policy "select_published_or_admin" on articles
  for select using (
    published = true
    or exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

create policy "insert_articles_admin_only" on articles
  for insert with check (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

create policy "update_articles_admin_only" on articles
  for update using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

create policy "delete_articles_admin_only" on articles
  for delete using (
    exists (select 1 from profiles where profiles.id = auth.uid() and profiles.is_admin = true)
  );

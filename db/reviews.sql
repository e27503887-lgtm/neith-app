-- Satıcı değerlendirmeleri: ProductCard'daki "★ 4.8" ortalaması bu tablodan
-- hesaplanır. Supabase SQL editöründe bir kez çalıştırın.

create table if not exists reviews (
  id bigint generated always as identity primary key,
  seller_id uuid not null references auth.users (id) on delete cascade,
  reviewer_id uuid not null references auth.users (id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (seller_id, reviewer_id),
  check (seller_id <> reviewer_id)
);

alter table reviews enable row level security;

create policy "reviews_select_all" on reviews
  for select using (true);

create policy "reviews_insert_own" on reviews
  for insert with check (auth.uid() = reviewer_id);

create policy "reviews_update_own" on reviews
  for update using (auth.uid() = reviewer_id);

create policy "reviews_delete_own" on reviews
  for delete using (auth.uid() = reviewer_id);

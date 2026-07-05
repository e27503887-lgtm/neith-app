-- Stores every product photo a user selects when sharing a "Kombin", so a
-- single outfit post can be backed by more than one image. `outfits.image_url`
-- stays as the cover photo (first upload) for backward compatibility with
-- every existing view that renders a single outfit image.
-- Run this once in the Supabase SQL editor.

create table if not exists outfit_images (
  id bigserial primary key,
  outfit_id bigint not null references outfits(id) on delete cascade,
  image_url text not null,
  position int not null default 0,
  created_at timestamptz default now()
);

create index if not exists idx_outfit_images_outfit_id on outfit_images (outfit_id);

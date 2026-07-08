-- Gamification katmanı: gardırop değeri gizliliği + rozet bildirimleri.
-- Supabase SQL editöründe bir kez çalıştırın.

-- 1) Gardırop değeri görünürlüğü (varsayılan: açık)
alter table public.profiles
  add column if not exists show_wardrobe_value boolean not null default true;

-- 2) Bildirim tablosuna rozet desteği
alter table public.notifications
  add column if not exists badge_key text;

-- type check constraint'ini 'badge' içerecek şekilde yenile.
-- Not: constraint adınız farklıysa (Supabase varsayılanı notifications_type_check),
-- önce şu sorguyla adı bulun:
--   select conname from pg_constraint
--   where conrelid = 'public.notifications'::regclass and contype = 'c';
alter table public.notifications
  drop constraint if exists notifications_type_check;

alter table public.notifications
  add constraint notifications_type_check
  check (type in ('like', 'comment', 'offer', 'message', 'follow', 'badge'));

-- 3) Rozet kazanıldığında bildirim düşüren tetikleyici.
-- Bildirim metni istemci tarafında "🏅 Yeni rozet kazandın!" olarak
-- biçimlendirilir; badge_key rozetin türünü taşır ("Yeni rozet kazandın: {badge_type}").
create or replace function public.notify_badge_earned()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.notifications (user_id, type, actor_username, badge_key, is_read)
  values (
    new.user_id,
    'badge',
    coalesce(
      (select username from public.profiles where id = new.user_id),
      ''
    ),
    new.badge_key,
    false
  );
  return new;
end;
$$;

drop trigger if exists on_badge_earned on public.badges;

create trigger on_badge_earned
  after insert on public.badges
  for each row
  execute function public.notify_badge_earned();

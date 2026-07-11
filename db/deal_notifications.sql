-- Anlaşma bildirimleri. Supabase SQL editöründe çalıştırın.
--
-- 1) notifications.type'a 'deal' değeri ekler (check constraint varsa).
--    NOT: Constraint adınız farklıysa `\d notifications` ile bakıp uyarlayın;
--    type kolonu serbest text ise bu blok atlanabilir.
do $$
begin
  if exists (
    select 1 from information_schema.table_constraints
    where table_name = 'notifications' and constraint_name = 'notifications_type_check'
  ) then
    alter table notifications drop constraint notifications_type_check;
    alter table notifications add constraint notifications_type_check
      check (type in ('like', 'comment', 'offer', 'message', 'follow', 'badge', 'deal'));
  end if;
end $$;

-- 2) Bildirim tetikleyicileri:
--    - anlaşma doğunca iki tarafa
--    - kargolanınca alıcıya
--    - tamamlanınca satıcıya
-- Bildirime karşı tarafın kullanıcı adı ve ürünün id'si yazılır; uygulama
-- 'deal' tipini /deals sayfasına yönlendirir.

create or replace function public.notify_deal_events()
returns trigger
language plpgsql
security definer
as $$
declare
  buyer_name text;
  seller_name text;
begin
  select username into buyer_name from profiles where id = new.buyer_id;
  select username into seller_name from profiles where id = new.seller_id;

  if tg_op = 'INSERT' then
    insert into notifications (user_id, type, actor_username, product_id)
    values
      (new.buyer_id, 'deal', coalesce(seller_name, 'satıcı'), new.product_id),
      (new.seller_id, 'deal', coalesce(buyer_name, 'alıcı'), new.product_id);
  elsif tg_op = 'UPDATE' and new.status is distinct from old.status then
    if new.status = 'shipped' then
      insert into notifications (user_id, type, actor_username, product_id)
      values (new.buyer_id, 'deal', coalesce(seller_name, 'satıcı'), new.product_id);
    elsif new.status = 'completed' then
      insert into notifications (user_id, type, actor_username, product_id)
      values (new.seller_id, 'deal', coalesce(buyer_name, 'alıcı'), new.product_id);
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists deals_notify_insert on deals;
create trigger deals_notify_insert
  after insert on deals
  for each row execute function public.notify_deal_events();

drop trigger if exists deals_notify_update on deals;
create trigger deals_notify_update
  after update on deals
  for each row execute function public.notify_deal_events();

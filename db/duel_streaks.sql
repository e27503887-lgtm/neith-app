-- Kombin Düellosu seri (streak) sistemi — üç parça. Supabase SQL
-- editöründe sırayla çalıştırın.
--
-- Varsayımlar (mevcut şemanızla eşleşmiyorsa kolon adlarını uyarlayın):
--   profiles(id, duel_streak int, last_duel_date date, streak_freezes int)
--   duel_votes(user_id, outfit_a_id, outfit_b_id, winner_id, created_at)
--   daily_vote_counts(user_id, vote_date date, vote_count int)
--     — uygulama bugünkü ilerleme çubuğunu bu kolonlarla okuyor
--       (app/duel/page.tsx). Kolon adlarınız farklıysa orada da güncelleyin.


-- 1) GÜNLÜK SERİ DONDURMA KONTROLÜ
-- /duel sayfası her açıldığında bir kez çağrılır (supabase.rpc). Kullanıcı
-- en az bir gün oy vermeden atlamışsa: dondurma hakkı varsa 1 harcanır ve
-- seri korunur; yoksa seri sıfırlanır.
--
-- NOT: last_duel_date, dondurma harcandığında "bugün"e DEĞİL "dün"e
-- ilerletiliyor (istenen "last_duel_date'i güncelleme" kuralının küçük bir
-- yorumu). Bunun nedeni: last_duel_date hiç değişmezse, kullanıcı aynı gün
-- içinde sayfayı birden çok kez açtığında (her ziyarette fonksiyon tekrar
-- çağrıldığı için) aynı atlanan gün için dondurma tekrar tekrar
-- harcanabilirdi. "Dün"e ilerletmek bunu tek seferle sınırlar; kullanıcı
-- bugün gerçekten oy verirse mevcut günlük-oy tetikleyiciniz last_duel_date'i
-- normal şekilde bugüne çeker ve seriyi bir arttırır.
create or replace function check_streak_freeze()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_last_duel_date date;
  v_streak int;
  v_freezes int;
begin
  if v_user_id is null then
    return;
  end if;

  select last_duel_date, duel_streak, streak_freezes
    into v_last_duel_date, v_streak, v_freezes
  from profiles
  where id = v_user_id
  for update;

  -- Hiç oy vermemiş ya da seri zaten sıfırsa yapacak bir şey yok.
  if v_last_duel_date is null or v_streak <= 0 then
    return;
  end if;

  -- Dün ya da bugün oy vermişse seri zaten geçerli.
  if v_last_duel_date >= current_date - 1 then
    return;
  end if;

  if v_freezes > 0 then
    update profiles
    set streak_freezes = streak_freezes - 1,
        last_duel_date = current_date - 1
    where id = v_user_id;
  else
    update profiles
    set duel_streak = 0
    where id = v_user_id;
  end if;
end;
$$;

grant execute on function check_streak_freeze() to authenticated;


-- 2) 7 GÜNLÜK SERİ HEDİYESİ
-- duel_streak, mevcut günlük-oy tetikleyiciniz tarafından güncellendiğinde
-- (10. oyda) her 7'nin katına ulaşıldığı an +1 streak_freeze otomatik
-- hediye edilir. Uygulama tarafı bunu yalnızca bir sonraki okumada
-- (streak_freezes arttığında) fark eder — ayrı bir bildirim tablosu
-- gerekmez, /duel sayfası kendi toast'ını duel_streak artışını görünce
-- gösterir.
create or replace function grant_streak_freeze_on_milestone()
returns trigger
language plpgsql
as $$
begin
  if new.duel_streak > old.duel_streak and new.duel_streak % 7 = 0 then
    update profiles
    set streak_freezes = streak_freezes + 1
    where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_grant_streak_freeze on profiles;
create trigger trg_grant_streak_freeze
after update of duel_streak on profiles
for each row
execute function grant_streak_freeze_on_milestone();


-- 3) "BU HAFTAYA YENİ BAŞLAYANLAR" GÖRÜNÜMÜ
-- Bir kullanıcının TÜM ZAMANLARDAKİ ilk düello oyu son 7 gün içindeyse bu
-- view'da görünür. app/components/DuelLeaderboard.tsx bunu okur.
create or replace view weekly_new_duelists as
select user_id, min(created_at) as first_vote_at
from duel_votes
group by user_id
having min(created_at) >= now() - interval '7 days';

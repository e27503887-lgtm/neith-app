-- trending_outfits view'ını düello kazanımlarıyla besler.
-- Skor: son 7 gün beğenileri x1 + son 7 gün düello kazanımları x3.
-- Supabase SQL editöründe çalıştırın.
--
-- NOT: Mevcut trending_outfits tanımınız beğeni dışında başka sinyaller de
-- (kaydetme, yorum vb.) içeriyorsa, aşağıdaki "likes_score" CTE'sini kendi
-- mevcut skor ifadenizle değiştirip duel_score toplamını koruyun. Uygulama
-- yalnızca id, title, image_url, trend_score kolonlarını okur
-- (app/components/DeferredSections.tsx).

create or replace view trending_outfits as
with likes_score as (
  select ol.outfit_id, count(*)::int as score
  from outfit_likes ol
  where ol.created_at >= now() - interval '7 days'
  group by ol.outfit_id
),
duel_score as (
  -- Kazanan kombin başına oy sayısı; her kazanım 3 puan.
  select dv.winner_id as outfit_id, (count(*) * 3)::int as score
  from duel_votes dv
  where dv.created_at >= now() - interval '7 days'
  group by dv.winner_id
)
select
  o.id,
  o.title,
  o.image_url,
  coalesce(l.score, 0) + coalesce(d.score, 0) as trend_score
from outfits o
left join likes_score l on l.outfit_id = o.id
left join duel_score d on d.outfit_id = o.id;

// Compose modal'ın olay isimleri ve tetikleyicisi — modalın kendisinden ayrı,
// bağımlılıksız bir modül. Böylece "Gönderi Paylaş" butonu taşıyan bileşenler
// (Navbar, MobileTabBar, ProfileTabs...) modal kodunu ve framer-motion'ı ilk
// pakete çekmez; modal ilk açılışta dinamik yüklenir.

export const COMPOSE_POST_OPEN_EVENT = "neith:compose-post-open";
export const POST_CREATED_EVENT = "neith:post-created";

export type CreatedPost = {
  id: number | string;
  user_id: string;
  caption: string | null;
  created_at: string;
  cover_url: string;
  cover_type: "image" | "video";
  media: { url: string; type: "image" | "video" }[];
  media_count: number;
  like_count: number;
  username: string;
  avatar_url: string | null;
  account_type: string | null;
};

export function openComposePost() {
  window.dispatchEvent(new Event(COMPOSE_POST_OPEN_EVENT));
}

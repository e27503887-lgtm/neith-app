"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { supabase } from "../utils/supabase";
import { runWhenIdle } from "../utils/idle";
import { getBadgeInfo } from "@/lib/badges";

type Notification = {
  id: number | string;
  // Bilinmeyen tipler de gelebilir (ileriye dönük) — panel çökmez,
  // genel bir satır gösterilir.
  type: string;
  actor_username: string;
  badge_key?: string;
  product_id: number | string | null;
  conversation_id: number | string | null;
  deal_id?: number | string | null;
  is_read: boolean;
  created_at: string;
};

function formatMessage(n: Notification) {
  switch (n.type) {
    case "like":
      return `${n.actor_username} ürününü beğendi`;
    case "comment":
      return `${n.actor_username} ürününe yorum yaptı`;
    case "offer":
      return `${n.actor_username} ürününe teklif verdi`;
    case "message":
      return `${n.actor_username} sana mesaj gönderdi`;
    case "follow":
      return `${n.actor_username} seni takip etmeye başladı`;
    case "badge": {
      // Rozet bildirimlerinde actor_username alanı rozet anahtarını taşır.
      const badgeLabel =
        getBadgeInfo(n.badge_key ?? n.actor_username)?.label ?? n.actor_username;
      return `🏅 Yeni rozet kazandın: ${badgeLabel}`;
    }
    case "deal":
      return `🤝 ${n.actor_username} ile anlaşmanda gelişme var`;
    default:
      return "Yeni bildirim";
  }
}

export default function NotificationBell() {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);

  const [userId, setUserId] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [shaking, setShaking] = useState(false);

  useEffect(() => {
    let active = true;

    async function init() {
      const { data } = await supabase.auth.getUser();
      const uid = data.user?.id ?? null;
      if (!active) return;
      setUserId(uid);

      if (!uid) return;

      const { count } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("is_read", false);

      if (!active) return;
      setUnreadCount(count ?? 0);
    }

    // Rozet sayısı ilk boyamayı bekletmesin — tarayıcı boşta kalınca yükle.
    const cancel = runWhenIdle(init);
    return () => {
      active = false;
      cancel();
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    const channel = supabase
      .channel(`notifications:${userId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "notifications",
          filter: `user_id=eq.${userId}`,
        },
        (payload) => {
          const newNotification = payload.new as Notification;
          setUnreadCount((c) => c + 1);
          setNotifications((prev) => [newNotification, ...prev].slice(0, 10));
          setShaking(true);
          setTimeout(() => setShaking(false), 500);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function togglePanel() {
    const next = !open;
    setOpen(next);

    if (next && userId) {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(10);

      setNotifications(data ?? []);
    }
  }

  async function handleMarkAllRead() {
    if (!userId) return;

    await supabase
      .from("notifications")
      .update({ is_read: true })
      .eq("user_id", userId)
      .eq("is_read", false);

    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);
  }

  async function handleNotificationClick(n: Notification) {
    if (!n.is_read) {
      await supabase.from("notifications").update({ is_read: true }).eq("id", n.id);
      setNotifications((prev) =>
        prev.map((item) => (item.id === n.id ? { ...item, is_read: true } : item))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    }

    setOpen(false);

    if (n.type === "deal") {
      router.push(n.deal_id ? `/deals/${n.deal_id}` : "/deals");
    } else if (n.type === "badge") {
      router.push("/achievements");
    } else if (n.product_id) {
      router.push(`/product/${n.product_id}`);
    } else if (n.conversation_id) {
      router.push(`/messages/${n.conversation_id}`);
    } else if (n.type === "follow") {
      router.push(`/profile/${n.actor_username}`);
    }
  }

  return (
    <div className="relative" ref={containerRef}>
      <button onClick={togglePanel} className="relative text-gray-500 hover:text-accent transition-colors">
        <Bell size={19} strokeWidth={1.5} className={shaking ? "animate-bell-shake" : ""} />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-ink text-paper text-[10px] leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-[85vw] max-w-80 bg-surface border border-neutral-200 rounded-xl shadow-lg overflow-hidden z-50 text-left">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200">
            <span className="text-sm font-semibold text-ink">Bildirimler</span>
            <button
              onClick={handleMarkAllRead}
              className="text-xs text-gray-500 hover:text-accent transition-colors"
            >
              Tümünü okundu işaretle
            </button>
          </div>

          <div className="max-h-96 overflow-y-auto divide-y divide-neutral-200">
            {notifications.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8">Henüz bildirimin yok.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotificationClick(n)}
                  className={`block w-full text-left px-4 py-3 text-sm hover:bg-gray-100 ${
                    n.is_read ? "bg-paper" : "bg-gray-50"
                  }`}
                >
                  <p className="text-ink">{formatMessage(n)}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {new Date(n.created_at).toLocaleDateString("tr-TR")}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

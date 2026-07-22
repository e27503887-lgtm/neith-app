"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowLeft, Mail } from "lucide-react";
import { supabase } from "../utils/supabase";
import type { User } from "@supabase/supabase-js";

type ConversationRow = {
  id: string;
  createdAt: string;
  otherUser: { id: string; username: string; avatar_url: string | null } | null;
  lastMessage: { content: string; created_at: string } | null;
};

type Message = {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  created_at: string;
};

type OtherUser = {
  id: string;
  username: string;
  avatar_url: string | null;
};

const SLIDE_TRANSITION = { duration: 0.25, ease: "easeOut" as const };

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? "100%" : "-100%" }),
  center: { x: 0 },
  exit: (direction: number) => ({ x: direction > 0 ? "-100%" : "100%" }),
};

export default function MobileMessagesPanel({ onClose }: { onClose: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);

  const [view, setView] = useState<"list" | "thread">("list");
  const [direction, setDirection] = useState(1);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let active = true;

    supabase.auth.getUser().then(async ({ data }) => {
      if (!active) return;
      setUser(data.user ?? null);

      if (!data.user) {
        setLoadingList(false);
        return;
      }

      const userId = data.user.id;
      const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (!active) return;

      if (!convos || convos.length === 0) {
        setLoadingList(false);
        return;
      }

      const otherIds = [
        ...new Set(convos.map((c) => (c.user1_id === userId ? c.user2_id : c.user1_id))),
      ];
      const conversationIds = convos.map((c) => c.id);

      const [{ data: profiles }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds),
        supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
      const lastMessageByConversation = new Map<string, { content: string; created_at: string }>();
      (msgs ?? []).forEach((m) => {
        if (!lastMessageByConversation.has(m.conversation_id)) {
          lastMessageByConversation.set(m.conversation_id, {
            content: m.content,
            created_at: m.created_at,
          });
        }
      });

      const rows: ConversationRow[] = convos.map((c) => {
        const otherId = c.user1_id === userId ? c.user2_id : c.user1_id;
        return {
          id: c.id,
          createdAt: c.created_at,
          otherUser: profileById.get(otherId) ?? null,
          lastMessage: lastMessageByConversation.get(c.id) ?? null,
        };
      });

      rows.sort((a, b) => {
        const aTime = a.lastMessage?.created_at ?? a.createdAt;
        const bTime = b.lastMessage?.created_at ?? b.createdAt;
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });

      setConversations(rows);
      setLoadingList(false);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (view !== "thread" || !activeConversationId || !user) return;

    let active = true;

    (async () => {
      const { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", activeConversationId)
        .maybeSingle();

      if (!active || !conversation) return;

      const otherId =
        conversation.user1_id === user.id ? conversation.user2_id : conversation.user1_id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", otherId)
        .single();

      if (!active) return;
      setOtherUser(profile ?? null);

      const { data: existingMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", activeConversationId)
        .order("created_at", { ascending: true });

      if (!active) return;
      setMessages(existingMessages ?? []);
    })();

    return () => {
      active = false;
    };
  }, [view, activeConversationId, user]);

  useEffect(() => {
    if (view !== "thread" || !activeConversationId) return;

    const channel = supabase
      .channel(`mobile-messages:${activeConversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [view, activeConversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  function openConversation(id: string) {
    setActiveConversationId(id);
    setMessages([]);
    setOtherUser(null);
    setDirection(1);
    setView("thread");
  }

  function backToList() {
    setDirection(-1);
    setView("list");
    setActiveConversationId(null);
  }

  function handleBack() {
    if (view === "thread") {
      backToList();
    } else {
      onClose();
    }
  }

  async function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = draft.trim();
    if (!user || !content || sending || !activeConversationId) return;

    setSending(true);
    setDraft("");

    const { error } = await supabase
      .from("messages")
      .insert([{ conversation_id: activeConversationId, sender_id: user.id, content }]);

    setSending(false);
    if (error) setDraft(content);
  }

  return (
    <motion.div
      className="md:hidden fixed inset-0 z-[80] bg-paper flex flex-col"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3 px-4 py-4 border-b border-neutral-200 shrink-0">
        <button
          onClick={handleBack}
          aria-label={view === "thread" ? "Listeye dön" : "Kapat"}
          className="text-ink"
        >
          <ArrowLeft size={20} strokeWidth={1.5} />
        </button>

        {view === "list" ? (
          <h2 className="font-serif text-lg text-center">Mesajlar</h2>
        ) : (
          <Link
            href={`/profile/${otherUser?.username ?? ""}`}
            onClick={onClose}
            className="flex items-center justify-center gap-2 min-w-0"
          >
            {otherUser?.avatar_url ? (
              <Image
                src={otherUser.avatar_url}
                alt={otherUser.username}
                width={28}
                height={28}
                className="w-7 h-7 rounded-full object-cover shrink-0"
              />
            ) : (
              <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                {otherUser?.username?.[0]?.toUpperCase() ?? "?"}
              </div>
            )}
            <span className="font-medium truncate">@{otherUser?.username ?? ""}</span>
          </Link>
        )}

        <div className="w-5" />
      </div>

      <div className="relative flex-1 overflow-hidden">
        <AnimatePresence initial={false} custom={direction}>
          {view === "list" ? (
            <motion.div
              key="list"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SLIDE_TRANSITION}
              className="absolute inset-0 overflow-y-auto"
            >
              {loadingList ? null : !user ? (
                <div className="flex flex-col items-center gap-3 text-gray-500 text-sm py-16 px-6 text-center">
                  <Mail size={28} strokeWidth={1} className="text-neutral-300" />
                  <span>Mesajlarını görmek için giriş yapmalısın.</span>
                  <Link href="/login" onClick={onClose} className="text-ink underline underline-offset-2">
                    Giriş yap
                  </Link>
                </div>
              ) : conversations.length === 0 ? (
                <div className="flex flex-col items-center gap-3 text-gray-500 text-sm py-16 px-6 text-center">
                  <Mail size={28} strokeWidth={1} className="text-neutral-300" />
                  Henüz mesajın yok.
                </div>
              ) : (
                <div className="divide-y divide-neutral-100">
                  {conversations.map((c) => (
                    <button
                      key={c.id}
                      onClick={() => openConversation(c.id)}
                      className="w-full flex items-center gap-3 px-4 min-h-[72px] hover:bg-gray-50 text-left transition-colors"
                    >
                      {c.otherUser?.avatar_url ? (
                        <Image
                          src={c.otherUser.avatar_url}
                          alt={c.otherUser.username}
                          width={48}
                          height={48}
                          className="w-12 h-12 rounded-full object-cover shrink-0"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
                          {c.otherUser?.username?.[0]?.toUpperCase() ?? "?"}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">
                          @{c.otherUser?.username ?? "Bilinmeyen kullanıcı"}
                        </p>
                        <p className="text-sm text-gray-500 truncate">
                          {c.lastMessage?.content ?? "Henüz mesaj yok"}
                        </p>
                      </div>
                      {c.lastMessage && (
                        <span className="text-xs text-gray-500 shrink-0">
                          {new Date(c.lastMessage.created_at).toLocaleDateString("tr-TR")}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="thread"
              custom={direction}
              variants={slideVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={SLIDE_TRANSITION}
              className="absolute inset-0 flex flex-col"
            >
              <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-2">
                {messages.map((m) => {
                  const isOwn = m.sender_id === user?.id;
                  return (
                    <div
                      key={m.id}
                      className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                        isOwn ? "bg-primary text-dark self-end" : "bg-gray-100 text-ink self-start"
                      }`}
                    >
                      {m.content}
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              <form onSubmit={handleSend} className="border-t border-neutral-200 p-3 flex gap-2 shrink-0">
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Mesaj yaz..."
                  className="flex-1 min-w-0 border rounded-full px-4 py-2.5 text-sm focus:outline-none"
                />
                <button
                  disabled={sending || !draft.trim()}
                  className="shrink-0 bg-primary text-dark px-4 py-2.5 rounded-full text-sm font-medium hover:bg-primary-hover disabled:opacity-50"
                >
                  Gönder
                </button>
              </form>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}

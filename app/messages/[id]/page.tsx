"use client";

import { useEffect, useRef, useState, use, type SubmitEvent } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabase";
import type { User } from "@supabase/supabase-js";

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

type Props = {
  params: Promise<{ id: string }>;
};

export default function ConversationPage({ params }: Props) {
  const { id: conversationId } = use(params);
  const router = useRouter();

  const [user, setUser] = useState<User | null>(null);
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [otherUser, setOtherUser] = useState<OtherUser | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      setUser(data.user);

      const { data: conversation } = await supabase
        .from("conversations")
        .select("*")
        .eq("id", conversationId)
        .maybeSingle();

      if (!conversation) {
        setNotFound(true);
        setCheckingAuth(false);
        return;
      }

      const otherId =
        conversation.user1_id === data.user.id ? conversation.user2_id : conversation.user1_id;

      const { data: profile } = await supabase
        .from("profiles")
        .select("id, username, avatar_url")
        .eq("id", otherId)
        .single();

      setOtherUser(profile ?? null);

      const { data: existingMessages } = await supabase
        .from("messages")
        .select("*")
        .eq("conversation_id", conversationId)
        .order("created_at", { ascending: true });

      setMessages(existingMessages ?? []);
      setCheckingAuth(false);
    });
  }, [conversationId, router]);

  useEffect(() => {
    const channel = supabase
      .channel(`messages:${conversationId}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function handleSend(e: SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    const content = draft.trim();
    if (!user || !content || sending) return;

    setSending(true);
    setDraft("");

    const { error } = await supabase
      .from("messages")
      .insert([{ conversation_id: conversationId, sender_id: user.id, content }]);

    setSending(false);

    if (error) {
      setDraft(content);
    }
  }

  if (checkingAuth) {
    return null;
  }

  if (notFound) {
    return (
      <main className="min-h-screen bg-paper pt-24 px-6 flex items-center justify-center">
        <p className="text-gray-500">Sohbet bulunamadı.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-6 px-6 flex flex-col">
      <div className="max-w-lg mx-auto w-full flex-1 flex flex-col bg-surface border border-neutral-200 rounded-xl overflow-hidden">
        <div className="border-b border-neutral-200 p-4 flex items-center gap-3">
          <Link
            href="/messages"
            aria-label="Mesajlara dön"
            className="text-gray-500 hover:text-ink transition-colors shrink-0"
          >
            <ArrowLeft size={20} strokeWidth={1.5} />
          </Link>
          <Link
            href={`/profile/${otherUser?.username ?? ""}`}
            className="font-medium hover:text-accent transition-colors"
          >
            @{otherUser?.username ?? "Bilinmeyen kullanıcı"}
          </Link>
        </div>

        <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-2 min-h-[50vh] max-h-[60vh]">
          {messages.map((m) => {
            const isOwn = m.sender_id === user?.id;
            return (
              <div
                key={m.id}
                className={`max-w-[75%] px-4 py-2 rounded-2xl text-sm ${
                  isOwn ? "bg-ink text-paper self-end" : "bg-gray-100 text-ink self-start"
                }`}
              >
                {m.content}
              </div>
            );
          })}
          <div ref={bottomRef} />
        </div>

        <form onSubmit={handleSend} className="border-t border-neutral-200 p-3 flex gap-2">
          <input
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            placeholder="Mesaj yaz..."
            className="flex-1 border rounded-full px-4 py-2.5 md:py-2 text-sm focus:outline-none"
          />
          <button
            disabled={sending || !draft.trim()}
            className="bg-ink text-paper px-4 py-2.5 md:py-2 rounded-full text-sm font-medium hover:bg-gray-800 disabled:opacity-50"
          >
            Gönder
          </button>
        </form>
      </div>
    </main>
  );
}

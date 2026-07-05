"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { supabase } from "../utils/supabase";

type ConversationRow = {
  id: string;
  createdAt: string;
  otherUser: { id: string; username: string; avatar_url: string | null } | null;
  lastMessage: { content: string; created_at: string } | null;
};

export default function MessagesPage() {
  const router = useRouter();
  const [checkingAuth, setCheckingAuth] = useState(true);
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<ConversationRow[]>([]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data.user) {
        router.push("/login");
        return;
      }

      const userId = data.user.id;
      setCheckingAuth(false);

      const { data: convos } = await supabase
        .from("conversations")
        .select("*")
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`);

      if (!convos || convos.length === 0) {
        setLoading(false);
        return;
      }

      const otherIds = [
        ...new Set(convos.map((c) => (c.user1_id === userId ? c.user2_id : c.user1_id))),
      ];
      const conversationIds = convos.map((c) => c.id);

      const [{ data: profiles }, { data: messages }] = await Promise.all([
        supabase.from("profiles").select("id, username, avatar_url").in("id", otherIds),
        supabase
          .from("messages")
          .select("conversation_id, content, created_at")
          .in("conversation_id", conversationIds)
          .order("created_at", { ascending: false }),
      ]);

      const profileById = new Map((profiles ?? []).map((p) => [p.id, p]));
      const lastMessageByConversation = new Map<string, { content: string; created_at: string }>();
      (messages ?? []).forEach((m) => {
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
      setLoading(false);
    });
  }, [router]);

  if (checkingAuth || loading) {
    return null;
  }

  return (
    <main className="min-h-screen bg-paper pt-24 pb-12 px-6">
      <div className="max-w-lg mx-auto">
        <h1 className="text-xl font-bold mb-6">Mesajlar</h1>

        {conversations.length === 0 ? (
          <div className="bg-paper border border-neutral-200 rounded-xl p-10 text-center text-gray-500 flex flex-col items-center gap-3">
            <Mail size={28} strokeWidth={1} className="text-neutral-300" />
            Henüz mesajın yok.
          </div>
        ) : (
          <div className="bg-paper border border-neutral-200 rounded-xl divide-y divide-neutral-200 overflow-hidden">
            {conversations.map((c) => (
              <Link
                key={c.id}
                href={`/messages/${c.id}`}
                className="flex items-center gap-3 p-4 hover:bg-gray-50"
              >
                {c.otherUser?.avatar_url ? (
                  <Image
                    src={c.otherUser.avatar_url}
                    alt={c.otherUser.username}
                    width={40}
                    height={40}
                    className="w-10 h-10 rounded-full object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center text-sm font-semibold text-gray-600 shrink-0">
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
              </Link>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}

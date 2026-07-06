"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { ArrowLeft, MessageCircle, Send, X } from "lucide-react";

type ChatMessage = {
  id: string;
  from: "me" | "them";
  text: string;
};

type Contact = {
  id: string;
  username: string;
};

const CONTACTS: Contact[] = [
  { id: "c1", username: "ayse" },
  { id: "c2", username: "mehmet" },
  { id: "c3", username: "elif" },
];

const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {
  c1: [{ id: "c1-1", from: "them", text: "O oversize blazer'ı hangi pantolonla giyiyorsun?" }],
  c2: [{ id: "c2-1", from: "them", text: "Vintage kargo pantolon geldi, kombin önerin var mı?" }],
  c3: [],
};

const INCOMING_SUGGESTIONS = [
  "Bu hafta blokecore bir kombin denemek ister misin?",
  "Siyah crop tişörtle dener misin, çok yakışır sanki.",
  "Yeni aldığım ayakkabıyla bir kombin önerebilir misin?",
  "Vintage ceketini o jeanle eşleştirsen fena olmaz.",
];

const AUTO_REPLIES = [
  "Bence süper olur, dene bence!",
  "Kesinlikle, bu kombin çok iyi durur.",
  "Bana da bir fotoğrafını atar mısın?",
  "Harika fikir, ben de deneyeceğim.",
];

const MIN_INCOMING_MS = 20000;
const MAX_INCOMING_MS = 40000;

function randomFrom<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export default function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [activeContactId, setActiveContactId] = useState<string | null>(null);
  const [messagesByContact, setMessagesByContact] =
    useState<Record<string, ChatMessage[]>>(INITIAL_MESSAGES);
  const [unreadByContact, setUnreadByContact] = useState<Record<string, number>>({});
  const [draft, setDraft] = useState("");

  const bottomRef = useRef<HTMLDivElement>(null);
  const activeContactIdRef = useRef<string | null>(null);
  const openRef = useRef(false);

  useEffect(() => {
    activeContactIdRef.current = activeContactId;
  }, [activeContactId]);

  useEffect(() => {
    openRef.current = open;
  }, [open]);

  // Simulates incoming Supabase Realtime messages arriving from other users.
  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      timeoutId = setTimeout(() => {
        const contact = randomFrom(CONTACTS);
        const message: ChatMessage = {
          id: `${contact.id}-${Date.now()}`,
          from: "them",
          text: randomFrom(INCOMING_SUGGESTIONS),
        };

        setMessagesByContact((prev) => ({
          ...prev,
          [contact.id]: [...(prev[contact.id] ?? []), message],
        }));

        const isViewingThisContact = openRef.current && activeContactIdRef.current === contact.id;
        if (!isViewingThisContact) {
          setUnreadByContact((prev) => ({
            ...prev,
            [contact.id]: (prev[contact.id] ?? 0) + 1,
          }));
        }

        scheduleNext();
      }, randomBetween(MIN_INCOMING_MS, MAX_INCOMING_MS));
    }

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeContactId, messagesByContact]);

  function openContact(id: string) {
    setActiveContactId(id);
    setUnreadByContact((prev) => ({ ...prev, [id]: 0 }));
  }

  function handleSend(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const text = draft.trim();
    if (!text || !activeContactId) return;

    const contactId = activeContactId;
    const message: ChatMessage = { id: `me-${Date.now()}`, from: "me", text };

    setMessagesByContact((prev) => ({
      ...prev,
      [contactId]: [...(prev[contactId] ?? []), message],
    }));
    setDraft("");

    // Simulates the other person replying in real time.
    setTimeout(() => {
      const reply: ChatMessage = {
        id: `${contactId}-${Date.now()}`,
        from: "them",
        text: randomFrom(AUTO_REPLIES),
      };
      setMessagesByContact((prev) => ({
        ...prev,
        [contactId]: [...(prev[contactId] ?? []), reply],
      }));
    }, randomBetween(2000, 5000));
  }

  const totalUnread = Object.values(unreadByContact).reduce((sum, n) => sum + n, 0);
  const activeContact = CONTACTS.find((c) => c.id === activeContactId) ?? null;
  const activeMessages = activeContactId ? messagesByContact[activeContactId] ?? [] : [];

  return (
    <>
      <button
        onClick={() => setOpen((v) => !v)}
        className="fixed bottom-40 md:bottom-6 right-4 md:right-6 z-40 w-11 h-11 flex items-center justify-center bg-ink text-paper border border-ink ring-4 ring-paper shadow-[0_4px_20px_rgba(0,0,0,0.2)] hover:scale-105 transition-transform"
      >
        {open ? <X size={18} /> : <MessageCircle size={18} strokeWidth={1.5} />}
        {!open && totalUnread > 0 && (
          <span className="absolute -top-1.5 -right-1.5 bg-accent text-paper text-[10px] leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center">
            {totalUnread > 9 ? "9+" : totalUnread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed bottom-56 md:bottom-20 right-4 md:right-6 z-40 w-72 sm:w-80 h-[440px] bg-paper border border-neutral-200 shadow-[0_4px_24px_rgba(0,0,0,0.12)] flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-neutral-200 shrink-0">
            {activeContact ? (
              <button
                onClick={() => setActiveContactId(null)}
                className="flex items-center gap-2 text-sm font-medium text-ink hover:text-accent transition-colors"
              >
                <ArrowLeft size={15} />@{activeContact.username}
              </button>
            ) : (
              <span className="font-serif text-lg text-ink">Sohbet</span>
            )}
            <button
              onClick={() => setOpen(false)}
              className="text-gray-400 hover:text-ink transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {!activeContact ? (
            <div className="flex-1 overflow-y-auto divide-y divide-neutral-200">
              {CONTACTS.map((c) => {
                const unread = unreadByContact[c.id] ?? 0;
                const lastMessage = messagesByContact[c.id]?.slice(-1)[0];
                return (
                  <button
                    key={c.id}
                    onClick={() => openContact(c.id)}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 text-left transition-colors"
                  >
                    <div className="w-9 h-9 rounded-full bg-gray-200 flex items-center justify-center text-xs font-semibold text-gray-600 shrink-0">
                      {c.username[0].toUpperCase()}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-ink truncate">@{c.username}</p>
                      <p className="text-xs text-gray-500 truncate">
                        {lastMessage?.text ?? "Henüz mesaj yok"}
                      </p>
                    </div>
                    {unread > 0 && (
                      <span className="bg-ink text-paper text-[10px] leading-none rounded-full min-w-[16px] h-4 px-1 flex items-center justify-center shrink-0">
                        {unread}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          ) : (
            <>
              <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
                {activeMessages.map((m) => (
                  <div
                    key={m.id}
                    className={`max-w-[80%] px-3 py-2 text-sm leading-5 ${
                      m.from === "me"
                        ? "self-end bg-ink text-paper"
                        : "self-start border border-neutral-200 text-ink"
                    }`}
                  >
                    {m.text}
                  </div>
                ))}
                <div ref={bottomRef} />
              </div>

              <form
                onSubmit={handleSend}
                className="border-t border-neutral-200 p-2.5 flex gap-2 shrink-0"
              >
                <input
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Kombin önerini yaz..."
                  className="flex-1 min-w-0 border border-neutral-200 px-3 py-2 text-sm focus:outline-none focus:border-ink transition-colors"
                />
                <button
                  disabled={!draft.trim()}
                  className="shrink-0 bg-ink text-paper px-3 py-2 text-sm disabled:opacity-40 transition-opacity"
                >
                  <Send size={14} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useState, useCallback } from "react";
import { Heart, MessageCircle, X } from "lucide-react";

type ToastType = "like" | "comment";

type ToastData = {
  id: number;
  type: ToastType;
  username: string;
};

const MOCK_USERS = ["ayse", "mehmet", "elif", "cansu", "burak"];
const DISMISS_MS = 5000;
const MIN_INTERVAL_MS = 14000;
const MAX_INTERVAL_MS = 26000;
const MAX_VISIBLE = 3;

function randomBetween(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: ToastData;
  onDismiss: (id: number) => void;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const showFrame = requestAnimationFrame(() => setVisible(true));
    const hideTimer = setTimeout(() => setVisible(false), DISMISS_MS);
    const removeTimer = setTimeout(() => onDismiss(toast.id), DISMISS_MS + 300);

    return () => {
      cancelAnimationFrame(showFrame);
      clearTimeout(hideTimer);
      clearTimeout(removeTimer);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast.id]);

  return (
    <div
      className={`flex items-start gap-3 bg-paper border border-neutral-200 px-4 py-3 shadow-[0_2px_14px_rgba(0,0,0,0.08)] transition-all duration-300 ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 translate-x-4"
      }`}
    >
      {toast.type === "like" ? (
        <Heart size={16} strokeWidth={1.5} className="text-ink mt-0.5 shrink-0" fill="currentColor" />
      ) : (
        <MessageCircle size={16} strokeWidth={1.5} className="text-ink mt-0.5 shrink-0" />
      )}
      <p className="text-sm text-ink flex-1 leading-5">
        <span className="font-medium">@{toast.username}</span>{" "}
        {toast.type === "like" ? "kombinini beğendi" : "kombinine yorum yaptı"}
      </p>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-gray-400 hover:text-ink transition-colors shrink-0"
      >
        <X size={14} />
      </button>
    </div>
  );
}

export default function NotificationSystem() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  useEffect(() => {
    let timeoutId: ReturnType<typeof setTimeout>;

    function scheduleNext() {
      timeoutId = setTimeout(() => {
        const toast: ToastData = {
          id: Date.now(),
          type: Math.random() > 0.5 ? "like" : "comment",
          username: MOCK_USERS[Math.floor(Math.random() * MOCK_USERS.length)],
        };
        setToasts((prev) => [...prev, toast].slice(-MAX_VISIBLE));
        scheduleNext();
      }, randomBetween(MIN_INTERVAL_MS, MAX_INTERVAL_MS));
    }

    scheduleNext();
    return () => clearTimeout(timeoutId);
  }, []);

  if (toasts.length === 0) {
    return null;
  }

  return (
    <div className="fixed top-24 right-6 z-[60] flex flex-col gap-2 w-72">
      {toasts.map((t) => (
        <ToastItem key={t.id} toast={t} onDismiss={dismiss} />
      ))}
    </div>
  );
}

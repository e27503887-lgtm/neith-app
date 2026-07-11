"use client";

// Yükleme formlarında fotoğraf seçiciden önce gösterilen kapatılabilir
// ipucu kartı. Kapatma tercihi sessionStorage'da tutulur — her oturumda
// en fazla bir kez görünür.

import { useEffect, useState } from "react";
import { X } from "lucide-react";

const STORAGE_KEY = "photo-tip-dismissed";

export default function PhotoTipCard() {
  // SSR/hydration uyumu için görünürlük mount sonrası belirlenir.
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      if (sessionStorage.getItem(STORAGE_KEY) !== "1") setVisible(true);
    } catch {
      // sessionStorage kapalıysa kart hiç gösterilmez.
    }
  }, []);

  function dismiss() {
    setVisible(false);
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // yoksay
    }
  }

  if (!visible) return null;

  return (
    <div className="relative border border-neutral-200 bg-neutral-50 px-4 py-3 pr-9">
      <p className="text-xs text-gray-600 leading-5">
        <span className="mr-1">📸</span>
        <span className="font-medium text-ink">İpucu:</span> Ayna karşısında, üzerinde çekilen
        fotoğraflar alıcıya daha çok güven verir. 10 saniyelik kısa bir video eklersen kumaşın
        hareketini de gösterebilirsin.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="İpucunu kapat"
        className="absolute top-2.5 right-2.5 text-gray-500 hover:text-ink transition-colors"
      >
        <X size={14} />
      </button>
    </div>
  );
}

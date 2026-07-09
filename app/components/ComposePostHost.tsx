"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { COMPOSE_POST_OPEN_EVENT } from "../utils/composeEvents";

// Modal kodu (framer-motion dahil) ilk "Gönderi Paylaş" tetiklenene kadar
// yüklenmez. İlk olayda chunk çekilir ve modal açık olarak mount edilir;
// sonraki açılışları modalın kendi dinleyicisi karşılar.
const ComposePostModal = dynamic(() => import("./ComposePostModal"), { ssr: false });

export default function ComposePostHost() {
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (loaded) return;

    function handleOpen() {
      setLoaded(true);
    }

    window.addEventListener(COMPOSE_POST_OPEN_EVENT, handleOpen);
    return () => window.removeEventListener(COMPOSE_POST_OPEN_EVENT, handleOpen);
  }, [loaded]);

  return loaded ? <ComposePostModal initialOpen /> : null;
}

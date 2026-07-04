"use client";

import { useState } from "react";
import Image from "next/image";

type MediaItem = {
  media_url: string;
  media_type: "image" | "video";
};

export default function ProductGallery({
  media,
  title,
}: {
  media: MediaItem[];
  title: string;
}) {
  const [activeIndex, setActiveIndex] = useState(0);
  const active = media[activeIndex] ?? media[0];

  return (
    <div className="w-full md:w-1/2 flex flex-col gap-2">
      <div className="relative w-full aspect-square overflow-hidden bg-gray-100">
        {active.media_type === "video" ? (
          <video
            src={active.media_url}
            controls
            className="w-full h-full object-cover"
          />
        ) : (
          <Image
            src={active.media_url}
            alt={title}
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
          />
        )}
      </div>

      {media.length > 1 && (
        <div className="flex gap-2 overflow-x-auto">
          {media.map((item, index) => (
            <button
              key={index}
              type="button"
              onClick={() => setActiveIndex(index)}
              className={`relative shrink-0 w-16 h-16 overflow-hidden border-2 transition-colors ${
                index === activeIndex ? "border-accent" : "border-transparent"
              }`}
            >
              {item.media_type === "video" ? (
                <video src={item.media_url} className="w-full h-full object-cover" muted />
              ) : (
                <Image
                  src={item.media_url}
                  alt={`${title} ${index + 1}`}
                  fill
                  sizes="64px"
                  className="object-cover"
                />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

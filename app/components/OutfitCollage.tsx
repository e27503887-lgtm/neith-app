"use client";

// Kombin akışı kartındaki "parça kolajı" — outfit_items'tan gelen gerçek
// ürün/özel parça fotoğraflarından bir kare-hücreli ızgara kurar. Hücreler
// arası 2px kırık beyaz derz (grid gap + zemin rengi), boş hücrelerde
// editoryal, göze batmayan bir dolgu (monogram ya da ince diyagonal çizgi).
//
// Izgaranın toplam en-boy oranı hücre sayısına göre kendiliğinden oluşur:
// her hücre kare olduğu için CSS grid, satır yüksekliğini sütun genişliğine
// göre otomatik hesaplar — ayrı bir aspect-ratio ayarına gerek yok.

import Image from "next/image";
import { computeCollageLayout, type CollagePiece } from "@/lib/collage";

const SIZES_BY_COLUMNS: Record<number, string> = {
  2: "(min-width: 1024px) 16vw, (min-width: 768px) 25vw, 50vw",
  3: "(min-width: 1024px) 11vw, (min-width: 768px) 17vw, 33vw",
};

function EmptyCollageCell({
  pattern,
  patternId,
}: {
  pattern: "monogram" | "diagonal";
  patternId: string;
}) {
  if (pattern === "diagonal") {
    return (
      <div className="relative aspect-square overflow-hidden bg-[#faf7f2]" aria-hidden>
        <svg className="absolute inset-0 h-full w-full">
          <defs>
            <pattern
              id={patternId}
              width="7"
              height="7"
              patternTransform="rotate(45)"
              patternUnits="userSpaceOnUse"
            >
              <line x1="0" y1="0" x2="0" y2="7" stroke="#e7e2d6" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill={`url(#${patternId})`} />
        </svg>
      </div>
    );
  }

  return (
    <div
      className="flex aspect-square items-center justify-center bg-[#faf7f2]"
      aria-hidden
    >
      <span className="font-serif text-2xl text-neutral-300 select-none">N</span>
    </div>
  );
}

export default function OutfitCollage({
  pieces,
  seedKey,
  alt,
}: {
  pieces: CollagePiece[];
  seedKey: string | number;
  alt: string;
}) {
  const layout = computeCollageLayout(pieces, seedKey);
  if (!layout) return null;

  const sizes = SIZES_BY_COLUMNS[layout.columns] ?? SIZES_BY_COLUMNS[3];

  return (
    <div
      className="grid w-full gap-[2px] bg-[#faf7f2]"
      style={{ gridTemplateColumns: `repeat(${layout.columns}, 1fr)` }}
    >
      {layout.cells.map((cell, index) => {
        if (cell.kind === "piece") {
          return (
            <div
              key={`piece-${cell.piece.id}`}
              className="relative aspect-square overflow-hidden bg-white"
            >
              <Image src={cell.piece.image_url} alt={alt} fill sizes={sizes} className="object-cover" />
            </div>
          );
        }

        if (cell.kind === "overflow") {
          return (
            <div
              key="overflow"
              className="relative flex aspect-square items-center justify-center bg-ink"
            >
              <span className="font-semibold text-base text-paper">+{cell.count}</span>
            </div>
          );
        }

        return (
          <EmptyCollageCell
            key={`empty-${index}`}
            pattern={cell.pattern}
            patternId={`collage-${seedKey}-${index}`}
          />
        );
      })}
    </div>
  );
}

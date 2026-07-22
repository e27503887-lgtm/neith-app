"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Swords } from "lucide-react";

type Fighter = {
  id: string;
  username: string;
  image_url: string;
  votes: number;
};

const fighters: [Fighter, Fighter] = [
  {
    id: "f1",
    username: "ayse",
    image_url:
      "https://images.unsplash.com/photo-1541099649105-f69ad21f3246?w=900&q=80&auto=format&fit=crop",
    votes: 128,
  },
  {
    id: "f2",
    username: "mehmet",
    image_url:
      "https://images.unsplash.com/photo-1520975911998-5ae3a1c1b9a1?w=900&q=80&auto=format&fit=crop",
    votes: 96,
  },
];

export default function OutfitBattle() {
  const [votes, setVotes] = useState<Record<string, number>>(
    Object.fromEntries(fighters.map((f) => [f.id, f.votes]))
  );
  const [votedId, setVotedId] = useState<string | null>(null);

  function handleVote(id: string) {
    if (votedId) return;
    setVotedId(id);
    setVotes((v) => ({ ...v, [id]: v[id] + 1 }));
  }

  const total = votes[fighters[0].id] + votes[fighters[1].id];

  return (
    <section id="kombin-savasi" className="mb-10 border border-neutral-200 bg-surface scroll-mt-24">
      <div className="flex items-center justify-center gap-2 border-b border-neutral-200 py-3">
        <Swords size={16} className="text-ink" strokeWidth={1.5} />
        <h2 className="text-xs uppercase tracking-[0.24em] font-medium text-ink">
          Kombin Savaşı
        </h2>
      </div>

      <div className="flex gap-4 p-4">
        {fighters.map((fighter) => {
          const hasVoted = votedId === fighter.id;
          const isLosing = votedId && votedId !== fighter.id;
          const percent = total > 0 ? Math.round((votes[fighter.id] / total) * 100) : 0;

          return (
            <div
              key={fighter.id}
              className="relative flex flex-1 flex-col border border-neutral-200"
            >
              <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-50">
                <Image
                  src={fighter.image_url}
                  alt={`@${fighter.username} kombini`}
                  fill
                  sizes="(min-width: 768px) 33vw, 50vw"
                  className={`object-cover transition-opacity duration-300 ${
                    isLosing ? "opacity-50" : "opacity-100"
                  }`}
                />
              </div>

              <div className="p-3 flex flex-col items-center gap-2 text-center">
                <span className="font-serif text-ink text-base">
                  @{fighter.username}
                </span>

                <button
                  onClick={() => handleVote(fighter.id)}
                  disabled={!!votedId}
                  className={`w-full flex items-center justify-center gap-2 border text-[11px] uppercase tracking-[0.2em] font-medium px-4 py-2 transition-colors duration-300 ${
                    hasVoted
                      ? "border-primary bg-primary text-dark"
                      : votedId
                      ? "border-neutral-200 text-gray-500"
                      : "border-primary text-ink hover:bg-primary hover:text-dark"
                  }`}
                >
                  {hasVoted ? (
                    <>
                      <Check size={13} strokeWidth={2} />
                      Oylandı
                    </>
                  ) : (
                    "Oy Ver"
                  )}
                </button>

                {votedId && (
                  <span className="font-semibold text-ink text-lg leading-none">
                    {votes[fighter.id]}
                    <span className="text-xs text-gray-500 font-sans ml-1">
                      ({percent}%)
                    </span>
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

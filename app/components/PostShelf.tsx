import Link from "next/link";
import Image from "next/image";

type ShelfPost = {
  id: number | string;
  cover_url: string;
  cover_type: "image" | "video";
};

export default function PostShelf({ posts }: { posts: ShelfPost[] }) {
  if (posts.length === 0) return null;

  return (
    <section className="py-8 border-b border-neutral-200 last:border-none">
      <h2 className="font-serif text-xl text-ink tracking-tight mb-4">Gönderiler</h2>
      <div className="flex gap-4 overflow-x-auto pb-2">
        {posts.map((post) => (
          <Link
            key={post.id}
            href={`/post/${post.id}`}
            className="group shrink-0 w-48 border border-neutral-200 hover:border-accent transition-colors"
          >
            <div className="relative w-full aspect-[3/4] overflow-hidden bg-neutral-50">
              {post.cover_type === "video" ? (
                <video src={post.cover_url} className="w-full h-full object-cover" muted />
              ) : (
                <Image
                  src={post.cover_url}
                  alt="Gönderi"
                  fill
                  sizes="192px"
                  className="object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                />
              )}
            </div>
          </Link>
        ))}
      </div>
    </section>
  );
}

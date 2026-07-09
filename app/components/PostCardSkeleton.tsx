export default function PostCardSkeleton() {
  return (
    <div className="w-full border-b border-neutral-200 px-4 py-3.5 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0" />
        <div className="flex-1 space-y-2 pt-1">
          <div className="h-3 w-28 bg-neutral-200 rounded" />
          <div className="h-2.5 w-16 bg-neutral-200 rounded" />
        </div>
      </div>
      <div className="mt-3 space-y-2">
        <div className="h-3 w-full bg-neutral-200 rounded" />
        <div className="h-3 w-2/3 bg-neutral-200 rounded" />
      </div>
      <div className="mt-3 w-full aspect-[4/3] bg-neutral-200 rounded-lg" />
      <div className="mt-3 border-t border-neutral-200 pt-2.5 flex gap-8">
        <div className="h-4 w-10 bg-neutral-200 rounded" />
        <div className="h-4 w-10 bg-neutral-200 rounded" />
        <div className="h-4 w-6 bg-neutral-200 rounded" />
      </div>
    </div>
  );
}

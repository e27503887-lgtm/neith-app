export default function PostCardSkeleton() {
  return (
    <div className="w-full border-b border-[#e1e1e1] px-4 py-3 animate-pulse">
      <div className="flex gap-3">
        <div className="w-10 h-10 rounded-full bg-neutral-200 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-3 w-28 bg-neutral-200 rounded" />
          <div className="mt-2 space-y-2">
            <div className="h-3 w-full bg-neutral-200 rounded" />
            <div className="h-3 w-2/3 bg-neutral-200 rounded" />
          </div>
          <div className="mt-2 w-full aspect-[4/3] bg-neutral-200 rounded-[12px]" />
          <div className="mt-2 flex gap-8">
            <div className="h-4 w-10 bg-neutral-200 rounded" />
            <div className="h-4 w-10 bg-neutral-200 rounded" />
            <div className="h-4 w-6 bg-neutral-200 rounded" />
          </div>
        </div>
      </div>
    </div>
  );
}

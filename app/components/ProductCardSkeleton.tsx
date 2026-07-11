export default function ProductCardSkeleton() {
  return (
    <div className="bg-surface border border-neutral-200 overflow-hidden animate-pulse">
      <div className="flex items-center gap-3 p-3">
        <div className="w-8 h-8 rounded-full bg-neutral-200 shrink-0" />
        <div className="h-3 w-24 bg-neutral-200 rounded" />
      </div>
      <div className="w-full aspect-[3/4] bg-neutral-200" />
      <div className="p-3 space-y-2">
        <div className="h-3 w-3/4 bg-neutral-200 rounded" />
        <div className="h-5 w-1/3 bg-neutral-200 rounded" />
      </div>
      <div className="p-3">
        <div className="h-9 w-full bg-neutral-200 rounded" />
      </div>
    </div>
  );
}

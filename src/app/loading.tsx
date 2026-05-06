export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="h-32 animate-pulse rounded-2xl border border-stone-200 bg-white" />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <div className="h-[32rem] animate-pulse rounded-2xl border border-stone-200 bg-white" />
        <div className="space-y-6">
          <div className="h-72 animate-pulse rounded-2xl border border-stone-200 bg-white" />
          <div className="h-72 animate-pulse rounded-2xl border border-stone-200 bg-white" />
        </div>
      </div>
    </div>
  );
}

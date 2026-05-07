type ProgressBarProps = {
  value: number;
  total: number;
};

export function ProgressBar({ value, total }: ProgressBarProps) {
  const ratio = total === 0 ? 0 : Math.round((value / total) * 100);
  const visualWidth = value > 0 && total > 0 ? Math.max(ratio, 6) : 0;

  return (
    <div className="space-y-2.5">
      <div className="flex items-center justify-between text-sm text-stone-600 dark:text-stone-300">
        <span className="font-medium text-stone-700 dark:text-stone-200">{value} labeled</span>
        <span className="rounded-full border border-stone-300/80 bg-white/80 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-stone-700 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:border-stone-700 dark:bg-stone-950/70 dark:text-stone-200">
          {ratio}% complete
        </span>
      </div>
      <div
        aria-label="Labeling progress"
        aria-valuemax={total}
        aria-valuemin={0}
        aria-valuenow={Math.min(value, total)}
        className="progress-track h-4 rounded-full border border-stone-300/80 bg-gradient-to-r from-stone-100 via-stone-200 to-stone-100 shadow-[inset_0_1px_1px_rgba(255,255,255,0.92),inset_0_-1px_2px_rgba(0,0,0,0.08)] dark:border-stone-700 dark:from-stone-950 dark:via-stone-900 dark:to-stone-950 dark:shadow-[inset_0_1px_1px_rgba(255,255,255,0.04),inset_0_-1px_2px_rgba(0,0,0,0.52)]"
        role="progressbar"
      >
        <div
          className="progress-fill relative h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-500 to-stone-950 shadow-[0_10px_24px_-14px_rgba(234,88,12,0.7)] dark:from-amber-300 dark:via-orange-300 dark:to-white dark:shadow-[0_12px_28px_-16px_rgba(251,191,36,0.5)]"
          style={{ width: `${visualWidth}%` }}
        />
      </div>
    </div>
  );
}

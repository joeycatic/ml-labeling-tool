type ProgressBarProps = {
  value: number;
  total: number;
};

export function ProgressBar({ value, total }: ProgressBarProps) {
  const ratio = total === 0 ? 0 : Math.round((value / total) * 100);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between text-sm text-stone-600">
        <span>{value} labeled</span>
        <span>{ratio}% complete</span>
      </div>
      <div className="progress-track h-3 rounded-full bg-stone-200">
        <div
          className="progress-fill h-full rounded-full bg-stone-900"
          style={{ width: `${ratio}%` }}
        />
      </div>
    </div>
  );
}

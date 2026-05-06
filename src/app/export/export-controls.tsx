"use client";

import { useState } from "react";

type ExportControlsProps = {
  defaultCount: number;
  allCount: number;
};

export function ExportControls({ defaultCount, allCount }: ExportControlsProps) {
  const [includeSkipped, setIncludeSkipped] = useState(false);
  const query = includeSkipped ? "?includeSkipped=1" : "";

  return (
    <div className="space-y-5">
      <label className="flex items-start gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
        <input
          type="checkbox"
          checked={includeSkipped}
          onChange={(event) => setIncludeSkipped(event.target.checked)}
          className="mt-1 h-4 w-4 rounded border-stone-300 text-stone-900"
        />
        <span>
          Include emails labeled <span className="font-medium text-stone-950">skip</span> in the export.
          <span className="mt-1 block text-stone-500">
            Default export count: {defaultCount}. With skipped emails: {allCount}.
          </span>
        </span>
      </label>

      <div className="flex flex-wrap gap-3">
        <a
          href={`/api/export/csv${query}`}
          className="rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800"
        >
          Download CSV
        </a>
        <a
          href={`/api/export/json${query}`}
          className="rounded-full border border-stone-200 bg-white px-5 py-2.5 text-sm font-medium text-stone-800 transition hover:border-stone-300 hover:bg-stone-50"
        >
          Download JSON
        </a>
      </div>
    </div>
  );
}

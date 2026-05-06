import { Panel } from "@/components/panel";
import { getExportRows, getStats } from "@/lib/emails";

import { ExportControls } from "./export-controls";

export const dynamic = "force-dynamic";

export default async function ExportPage() {
  const [stats, defaultRows, allRows] = await Promise.all([
    getStats(),
    getExportRows(false),
    getExportRows(true),
  ]);

  return (
    <div className="space-y-6">
      <Panel title="Export Training Dataset" description="Download labeled emails as CSV or JSON for Python-based training workflows.">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <p className="text-sm text-stone-600">Default ML export</p>
            <p className="mt-3 text-3xl font-semibold text-stone-950">{defaultRows.length}</p>
            <p className="mt-2 text-sm text-stone-500">
              Includes important, useful, and irrelevant.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-600">Including skipped emails</p>
            <p className="mt-3 text-3xl font-semibold text-stone-950">{allRows.length}</p>
            <p className="mt-2 text-sm text-stone-500">
              Useful for audits, but usually not for the first classifier.
            </p>
          </div>
          <div className="rounded-2xl border border-stone-200 bg-white p-4">
            <p className="text-sm text-stone-600">Currently skipped</p>
            <p className="mt-3 text-3xl font-semibold text-stone-950">
              {stats.summary.skipped}
            </p>
            <p className="mt-2 text-sm text-stone-500">
              Skipped emails stay out of the default ML export.
            </p>
          </div>
        </div>
      </Panel>

      <Panel title="Download options" description="Browser downloads only. No external storage or background sync.">
        <ExportControls defaultCount={defaultRows.length} allCount={allRows.length} />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Export fields" description="CSV includes a combined text field plus raw columns.">
          <div className="space-y-2 text-sm leading-7 text-stone-700">
            <p>`text` = subject + snippet + bodyText</p>
            <p>`label`</p>
            <p>`category`</p>
            <p>`subject`</p>
            <p>`senderEmail`</p>
            <p>`receivedAt`</p>
            <p>`id`</p>
            <p>`messageId`</p>
            <p>`snippet`</p>
            <p>`bodyText`</p>
          </div>
        </Panel>

        <Panel title="ML readiness" description="The export format is intentionally plain so Python tooling can pick it up without cleanup.">
          <div className="space-y-3 text-sm leading-7 text-stone-700">
            <p>Start with TF-IDF on the `text` column and a Logistic Regression classifier for a cheap baseline.</p>
            <p>Later, reuse the raw fields to move into transformer-based classification with Hugging Face or sentence embeddings.</p>
            <p>Keep the first model focused on the primary label. Category stays optional metadata for later slicing and evaluation.</p>
          </div>
        </Panel>
      </div>
    </div>
  );
}

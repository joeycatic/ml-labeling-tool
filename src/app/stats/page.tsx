import { CategoryBadge, LabelBadge } from "@/components/badge";
import { Panel } from "@/components/panel";
import { ProgressBar } from "@/components/progress-bar";
import { CATEGORY_META, LABEL_META } from "@/lib/constants";
import { getStats } from "@/lib/emails";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StatsPage() {
  const stats = await getStats();

  return (
    <div className="space-y-6">
      <Panel title="Labeling Progress" description="Track throughput, class balance, and recent activity across the dataset.">
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_repeat(4,minmax(0,1fr))]">
          <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4">
            <div className="space-y-3">
              <p className="text-sm font-medium text-stone-600">Overall progress</p>
              <p className="text-3xl font-semibold text-stone-950">
                {stats.summary.labeled} / {stats.summary.total}
              </p>
              <ProgressBar value={stats.summary.labeled} total={stats.summary.total} />
            </div>
          </div>
          {[
            { label: "Total emails", value: stats.summary.total },
            { label: "Unlabeled", value: stats.summary.unlabeled },
            { label: "Skipped", value: stats.summary.skipped },
            { label: "Completion", value: `${stats.summary.progressPercentage}%` },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-2xl border border-stone-200 bg-white p-4"
            >
              <p className="text-sm text-stone-600">{item.label}</p>
              <p className="mt-3 text-3xl font-semibold text-stone-950">{item.value}</p>
            </div>
          ))}
        </div>
      </Panel>

      {stats.balanceWarning ? (
        <Panel title="Class Balance Warning" className="border-amber-200 bg-amber-50">
          <p className="text-sm leading-7 text-amber-900">{stats.balanceWarning}</p>
        </Panel>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Primary label counts" description="These classes feed the first ML model.">
          <div className="space-y-4">
            {stats.labelCounts.map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <LabelBadge label={item.key} />
                  </div>
                  <span className="text-sm font-medium text-stone-700">{item.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-stone-900"
                    style={{
                      width: `${stats.summary.total === 0 ? 0 : Math.round((item.count / stats.summary.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Category counts" description="Optional categories help with later analysis and slicing.">
          <div className="space-y-4">
            {stats.categoryCounts.map((item) => (
              <div key={item.key} className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CategoryBadge category={item.key} />
                    <span className="text-sm text-stone-700">{CATEGORY_META[item.key as keyof typeof CATEGORY_META].title}</span>
                  </div>
                  <span className="text-sm font-medium text-stone-700">{item.count}</span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-stone-200">
                  <div
                    className="h-full rounded-full bg-stone-900"
                    style={{
                      width: `${stats.summary.total === 0 ? 0 : Math.round((item.count / stats.summary.total) * 100)}%`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel title="Recent labeling activity" description="Latest emails with a recorded label.">
          {stats.recentActivity.length === 0 ? (
            <p className="text-sm text-stone-600">No labeled emails yet.</p>
          ) : (
            <div className="space-y-3">
              {stats.recentActivity.map((email) => (
                <div
                  key={email.id}
                  className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <LabelBadge label={email.label} />
                    <CategoryBadge category={email.category} />
                  </div>
                  <p className="mt-3 font-medium text-stone-950">
                    {email.subject || "Untitled email"}
                  </p>
                  <p className="text-sm text-stone-600">{email.senderEmail}</p>
                  <p className="mt-2 text-xs uppercase tracking-[0.14em] text-stone-500">
                    Labeled {formatDateTime(email.labeledAt ?? email.updatedAt)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </Panel>

        <Panel title="Class balance" description="Important, useful, and irrelevant should stay reasonably balanced.">
          <div className="space-y-4">
            {stats.classBalance.map((item) => (
              <div key={item.key} className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-stone-700">
                    {LABEL_META[item.key as keyof typeof LABEL_META].title}
                  </span>
                  <span className="text-lg font-semibold text-stone-950">{item.count}</span>
                </div>
              </div>
            ))}
          </div>
        </Panel>
      </div>
    </div>
  );
}

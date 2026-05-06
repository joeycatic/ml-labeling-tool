import { CategoryBadge, LabelBadge } from "@/components/badge";
import { EmailCard } from "@/components/email-card";
import { EmailEditor } from "@/components/email-editor";
import { Panel } from "@/components/panel";
import { CATEGORY_META, CATEGORY_VALUES, LABEL_META, LABEL_VALUES } from "@/lib/constants";
import { getEmailById, getEmailHistory, listEmails } from "@/lib/emails";
import { serializeEmail } from "@/lib/serializers";
import { listEmailsQuerySchema } from "@/lib/validation";

import { EmailsTableClient } from "./emails-table-client";

export const dynamic = "force-dynamic";

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function buildQueryString(
  current: Record<string, string | string[] | undefined>,
  updates: Record<string, string | number | undefined>,
) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(current)) {
    const resolvedValue = firstValue(value);

    if (resolvedValue) {
      params.set(key, resolvedValue);
    }
  }

  for (const [key, value] of Object.entries(updates)) {
    if (value === undefined || value === "") {
      params.delete(key);
      continue;
    }

    params.set(key, String(value));
  }

  return params.toString();
}

export default async function EmailsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const rawParams = await searchParams;
  const parsed = listEmailsQuerySchema.parse({
    q: firstValue(rawParams.q),
    label: firstValue(rawParams.label),
    category: firstValue(rawParams.category),
    status: firstValue(rawParams.status),
    sort: firstValue(rawParams.sort),
    page: firstValue(rawParams.page),
    pageSize: firstValue(rawParams.pageSize),
    emailId: firstValue(rawParams.emailId),
  });

  const result = await listEmails(parsed);
  const selectedId = parsed.emailId ?? result.emails[0]?.id ?? null;
  const [selectedEmail, history] = await Promise.all([
    selectedId ? getEmailById(selectedId) : null,
    selectedId ? getEmailHistory(selectedId, 12) : [],
  ]);
  const selectedRecord = serializeEmail(selectedEmail);
  const rows = result.emails.map((email) => ({
    id: email.id,
    href: `/emails?${buildQueryString(rawParams, {
      emailId: email.id,
      page: result.page,
    })}`,
    selected: selectedId === email.id,
    subject: email.subject,
    snippet: email.snippet,
    bodyText: email.bodyText,
    senderName: email.senderName,
    senderEmail: email.senderEmail,
    receivedAt: email.receivedAt.toISOString(),
    label: email.label,
    category: email.category,
  }));

  return (
    <div className="space-y-6">
      <Panel title="Email Explorer" description="Search, filter, paginate, and edit labels across the full dataset.">
        <form className="grid gap-4 lg:grid-cols-[minmax(0,1.6fr)_repeat(4,minmax(0,1fr))]">
          <input
            type="search"
            name="q"
            defaultValue={parsed.q}
            placeholder="Search subject, sender, snippet, or body"
            className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
          />
          <select
            name="label"
            defaultValue={parsed.label}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
          >
            <option value="all">All labels</option>
            {LABEL_VALUES.map((label) => (
              <option key={label} value={label}>
                {LABEL_META[label].title}
              </option>
            ))}
          </select>
          <select
            name="category"
            defaultValue={parsed.category}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
          >
            <option value="all">All categories</option>
            {CATEGORY_VALUES.map((category) => (
              <option key={category} value={category}>
                {CATEGORY_META[category].title}
              </option>
            ))}
          </select>
          <select
            name="status"
            defaultValue={parsed.status}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
          >
            <option value="all">All statuses</option>
            <option value="labeled">Labeled</option>
            <option value="unlabeled">Unlabeled</option>
          </select>
          <select
            name="sort"
            defaultValue={parsed.sort}
            className="rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
          >
            <option value="receivedAt_desc">Newest first</option>
            <option value="receivedAt_asc">Oldest first</option>
          </select>
          <button
            type="submit"
            className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800"
          >
            Apply filters
          </button>
        </form>
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
        <Panel
          title={`All emails (${result.totalCount})`}
          description={`Page ${result.page} of ${result.totalPages}`}
          className="overflow-hidden"
        >
          {result.emails.length === 0 ? (
            <p className="text-sm text-stone-600">No emails match the current filter set.</p>
          ) : (
            <EmailsTableClient
              emails={rows}
              totalCount={result.totalCount}
              page={result.page}
              totalPages={result.totalPages}
              pageSize={result.pageSize}
              previousPageHref={`/emails?${buildQueryString(rawParams, {
                page: Math.max(1, result.page - 1),
              })}`}
              nextPageHref={`/emails?${buildQueryString(rawParams, {
                page: Math.min(result.totalPages, result.page + 1),
              })}`}
            />
          )}
        </Panel>

        {selectedRecord ? (
          <div className="space-y-6">
            <EmailCard email={selectedRecord} compact />
            <Panel title="Edit label" description="Adjust the primary label, optional category, or notes.">
              <EmailEditor email={selectedRecord} />
            </Panel>
            <Panel title="Recent history" description="Append-only audit events for this email.">
              {history.length === 0 ? (
                <p className="text-sm text-stone-600">No history has been recorded yet.</p>
              ) : (
                <div className="space-y-3">
                  {history.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <LabelBadge label={entry.label} />
                        <CategoryBadge category={entry.category} />
                        <span className="rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-stone-600">
                          {entry.eventType}
                        </span>
                      </div>
                      <p className="mt-2 text-sm font-medium text-stone-900">
                        {entry.subject || "Untitled email"}
                      </p>
                      <p className="mt-1 text-xs text-stone-600">
                        Source: {entry.sourceSurface} • Changed: {entry.changedFields.join(", ") || "n/a"}
                      </p>
                      <p className="mt-1 text-xs uppercase tracking-[0.14em] text-stone-500">
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(entry.createdAt))}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </Panel>
          </div>
        ) : (
          <Panel title="No email selected" description="Choose an email from the table to inspect its full content.">
            <p className="text-sm text-stone-600">The current page has no selectable email.</p>
          </Panel>
        )}
      </div>
    </div>
  );
}

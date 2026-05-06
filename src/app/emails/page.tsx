import Link from "next/link";

import { CategoryBadge, LabelBadge } from "@/components/badge";
import { EmailCard } from "@/components/email-card";
import { EmailEditor } from "@/components/email-editor";
import { Panel } from "@/components/panel";
import { CATEGORY_META, CATEGORY_VALUES, LABEL_META, LABEL_VALUES } from "@/lib/constants";
import { getEmailById, listEmails } from "@/lib/emails";
import { serializeEmail } from "@/lib/serializers";
import { formatShortDate } from "@/lib/utils";
import { listEmailsQuerySchema } from "@/lib/validation";

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
  const selectedEmail = selectedId ? await getEmailById(selectedId) : null;
  const selectedRecord = serializeEmail(selectedEmail);

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
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="px-3 py-3 font-medium">Subject</th>
                    <th className="px-3 py-3 font-medium">Sender</th>
                    <th className="px-3 py-3 font-medium">Received</th>
                    <th className="px-3 py-3 font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {result.emails.map((email) => {
                    const href = `/emails?${buildQueryString(rawParams, {
                      emailId: email.id,
                      page: result.page,
                    })}`;

                    return (
                      <tr
                        key={email.id}
                        className={
                          selectedId === email.id ? "bg-stone-50/90" : "hover:bg-stone-50/60"
                        }
                      >
                        <td className="px-3 py-3 align-top">
                          <Link href={href} className="block space-y-1">
                            <span className="line-clamp-2 font-medium text-stone-950">
                              {email.subject || "Untitled email"}
                            </span>
                            <span className="line-clamp-2 text-xs text-stone-500">
                              {email.snippet || email.bodyText || "No preview available."}
                            </span>
                          </Link>
                        </td>
                        <td className="px-3 py-3 align-top text-stone-600">
                          <div className="space-y-1">
                            <p>{email.senderName || email.senderEmail}</p>
                            <p className="text-xs">{email.senderEmail}</p>
                          </div>
                        </td>
                        <td className="px-3 py-3 align-top text-stone-600">
                          {formatShortDate(email.receivedAt)}
                        </td>
                        <td className="px-3 py-3 align-top">
                          <div className="flex flex-wrap gap-2">
                            <LabelBadge label={email.label} />
                            <CategoryBadge category={email.category} />
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <div className="mt-5 flex items-center justify-between border-t border-stone-100 pt-4 text-sm text-stone-600">
            <Link
              href={`/emails?${buildQueryString(rawParams, {
                page: Math.max(1, result.page - 1),
              })}`}
              className={`rounded-full border px-4 py-2 ${
                result.page === 1
                  ? "pointer-events-none border-stone-100 text-stone-300"
                  : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-stone-100"
              }`}
            >
              Previous page
            </Link>
            <span>
              Showing {(result.page - 1) * result.pageSize + 1} to{" "}
              {Math.min(result.page * result.pageSize, result.totalCount)} of {result.totalCount}
            </span>
            <Link
              href={`/emails?${buildQueryString(rawParams, {
                page: Math.min(result.totalPages, result.page + 1),
              })}`}
              className={`rounded-full border px-4 py-2 ${
                result.page === result.totalPages
                  ? "pointer-events-none border-stone-100 text-stone-300"
                  : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-stone-100"
              }`}
            >
              Next page
            </Link>
          </div>
        </Panel>

        {selectedRecord ? (
          <div className="space-y-6">
            <EmailCard email={selectedRecord} compact />
            <Panel title="Edit label" description="Adjust the primary label, optional category, or notes.">
              <EmailEditor email={selectedRecord} />
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

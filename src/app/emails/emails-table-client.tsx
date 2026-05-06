"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CategoryBadge, LabelBadge } from "@/components/badge";
import { CATEGORY_META, CATEGORY_VALUES, LABEL_META, LABEL_VALUES } from "@/lib/constants";
import { formatShortDate } from "@/lib/utils";

type EmailTableRow = {
  id: number;
  href: string;
  selected: boolean;
  subject: string;
  snippet: string;
  bodyText: string | null;
  senderName: string | null;
  senderEmail: string;
  receivedAt: string;
  label: string | null;
  category: string | null;
};

type EmailsTableClientProps = {
  emails: EmailTableRow[];
  totalCount: number;
  page: number;
  totalPages: number;
  pageSize: number;
  previousPageHref: string;
  nextPageHref: string;
};

export function EmailsTableClient({
  emails,
  totalCount,
  page,
  totalPages,
  pageSize,
  previousPageHref,
  nextPageHref,
}: EmailsTableClientProps) {
  const router = useRouter();
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [label, setLabel] = useState("");
  const [category, setCategory] = useState("");
  const [clearCategory, setClearCategory] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const allVisibleIds = useMemo(() => emails.map((email) => email.id), [emails]);
  const allSelected =
    allVisibleIds.length > 0 && allVisibleIds.every((id) => selectedIds.includes(id));
  const selectionCountLabel = `${selectedIds.length} selected`;

  const checkboxClassName =
    "h-4 w-4 rounded border-stone-300 bg-white text-stone-900 accent-stone-900 outline-none focus:ring-2 focus:ring-stone-300 dark:border-stone-600 dark:bg-stone-900 dark:text-stone-100 dark:accent-stone-100 dark:focus:ring-stone-700";

  function toggleSelection(id: number) {
    setSelectedIds((previous) =>
      previous.includes(id)
        ? previous.filter((currentId) => currentId !== id)
        : [...previous, id],
    );
  }

  function toggleSelectAll() {
    setSelectedIds(() => (allSelected ? [] : allVisibleIds));
  }

  function handleBulkApply() {
    setError(null);
    setMessage(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/emails/bulk", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ids: selectedIds,
              label: label || undefined,
              category: category || undefined,
              clearCategory,
            }),
          });
          const result = (await response.json()) as {
            error?: string;
            updatedCount?: number;
          };

          if (!response.ok) {
            throw new Error(result.error ?? "Bulk update failed.");
          }

          setMessage(`Updated ${result.updatedCount ?? 0} emails.`);
          setSelectedIds([]);
          setLabel("");
          setCategory("");
          setClearCategory(false);
          router.refresh();
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Bulk update failed.",
          );
        }
      })();
    });
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-stone-200 bg-stone-50 p-4 md:p-5">
        <div className="space-y-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-stone-900">Bulk labeling</p>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex rounded-full border border-stone-200 bg-white px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-stone-600">
                {selectionCountLabel}
              </span>
              <p className="text-sm leading-6 text-stone-600">
                Select emails on this page to batch relabel or change category.
              </p>
            </div>
          </div>
          <div className="grid gap-3 lg:grid-cols-2">
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Label
              </span>
              <select
                value={label}
                onChange={(event) => setLabel(event.target.value)}
                className="min-w-0 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400"
              >
                <option value="">Leave label unchanged</option>
                {LABEL_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {LABEL_META[value].title}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-2">
              <span className="text-xs font-semibold uppercase tracking-[0.14em] text-stone-500">
                Category
              </span>
              <select
                value={category}
                onChange={(event) => setCategory(event.target.value)}
                disabled={clearCategory}
                className="min-w-0 rounded-2xl border border-stone-200 bg-white px-3 py-3 text-sm text-stone-900 outline-none transition focus:border-stone-400 disabled:cursor-not-allowed disabled:bg-stone-100"
              >
                <option value="">Leave category unchanged</option>
                {CATEGORY_VALUES.map((value) => (
                  <option key={value} value={value}>
                    {CATEGORY_META[value].title}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={handleBulkApply}
              disabled={
                isPending ||
                selectedIds.length === 0 ||
                (!label && !category && !clearCategory)
              }
              className="rounded-full bg-stone-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400 lg:col-span-2 lg:justify-self-start"
            >
              {isPending ? "Applying..." : `Apply to ${selectedIds.length || 0}`}
            </button>
          </div>
        </div>
        <label className="mt-4 inline-flex items-center gap-2 text-sm text-stone-700">
          <input
            type="checkbox"
            checked={clearCategory}
            onChange={(event) => setClearCategory(event.target.checked)}
            className={checkboxClassName}
          />
          Clear category
        </label>
        {message ? <p className="mt-3 text-sm text-emerald-700">{message}</p> : null}
        {error ? <p className="mt-3 text-sm text-rose-700">{error}</p> : null}
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
          <thead className="bg-stone-50 text-stone-600">
            <tr>
              <th className="px-3 py-3 font-medium">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  className={checkboxClassName}
                />
              </th>
              <th className="px-3 py-3 font-medium">Subject</th>
              <th className="px-3 py-3 font-medium">Sender</th>
              <th className="px-3 py-3 font-medium">Received</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-stone-100">
            {emails.map((email) => (
              <tr
                key={email.id}
                className={
                  email.selected
                    ? "bg-stone-100/80 dark:bg-stone-100/80"
                    : "hover:bg-stone-50/60 dark:hover:bg-stone-50/60"
                }
              >
                <td className="px-3 py-3 align-top">
                  <input
                    type="checkbox"
                    checked={selectedIds.includes(email.id)}
                    onChange={() => toggleSelection(email.id)}
                    className={`mt-1 ${checkboxClassName}`}
                  />
                </td>
                <td className="px-3 py-3 align-top">
                  <Link href={email.href} className="block space-y-1">
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
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex items-center justify-between border-t border-stone-100 pt-4 text-sm text-stone-600">
        <Link
          href={previousPageHref}
          className={`rounded-full border px-4 py-2 ${
            page === 1
              ? "pointer-events-none border-stone-100 text-stone-300"
              : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-stone-100"
          }`}
        >
          Previous page
        </Link>
        <span>
          Showing {(page - 1) * pageSize + 1} to {Math.min(page * pageSize, totalCount)} of{" "}
          {totalCount}
          <span className="ml-2 text-stone-400">Page {page} of {totalPages}</span>
        </span>
        <Link
          href={nextPageHref}
          className={`rounded-full border px-4 py-2 ${
            page === totalPages
              ? "pointer-events-none border-stone-100 text-stone-300"
              : "border-stone-200 bg-stone-50 text-stone-700 hover:border-stone-300 hover:bg-stone-100"
          }`}
        >
          Next page
        </Link>
      </div>
    </div>
  );
}

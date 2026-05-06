"use client";

import { CheckCircle2, LoaderCircle, Save } from "lucide-react";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { CATEGORY_META, CATEGORY_VALUES, LABEL_META, LABEL_VALUES } from "@/lib/constants";
import type { EmailRecord } from "@/lib/serializers";

type EmailEditorProps = {
  email: EmailRecord;
};

export function EmailEditor({ email }: EmailEditorProps) {
  const router = useRouter();
  const [label, setLabel] = useState(email.label ?? "");
  const [category, setCategory] = useState(email.category ?? "");
  const [notes, setNotes] = useState(email.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const handleSave = () => {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await fetch(`/api/emails/${email.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            label: label || null,
            category: category || null,
            notes: notes || null,
          }),
        });

        const result = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(result.error ?? "Failed to save email.");
        }

        setMessage("Changes saved.");
        router.refresh();
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : "Failed to save email.",
        );
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-800" htmlFor="email-label">
          Primary label
        </label>
        <select
          id="email-label"
          value={label}
          onChange={(event) => setLabel(event.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-0 transition focus:border-stone-400"
        >
          <option value="">Unlabeled</option>
          {LABEL_VALUES.map((value) => (
            <option key={value} value={value}>
              {LABEL_META[value].title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-800" htmlFor="email-category">
          Optional category
        </label>
        <select
          id="email-category"
          value={category}
          onChange={(event) => setCategory(event.target.value)}
          className="w-full rounded-xl border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-900 outline-none ring-0 transition focus:border-stone-400"
        >
          <option value="">None</option>
          {CATEGORY_VALUES.map((value) => (
            <option key={value} value={value}>
              {CATEGORY_META[value].title}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium text-stone-800" htmlFor="email-notes">
          Notes
        </label>
        <textarea
          id="email-notes"
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          rows={4}
          maxLength={500}
          placeholder="Optional note for edge cases or ambiguity."
          className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-stone-400"
        />
      </div>

      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
      {message ? (
        <p className="flex items-center gap-2 text-sm text-emerald-700">
          <CheckCircle2 className="h-4 w-4" />
          {message}
        </p>
      ) : null}

      <button
        type="button"
        onClick={handleSave}
        disabled={isPending}
        className="button-press inline-flex items-center justify-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
      >
        {isPending ? (
          <>
            <LoaderCircle className="h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="h-4 w-4" />
            Save changes
          </>
        )}
      </button>
    </div>
  );
}

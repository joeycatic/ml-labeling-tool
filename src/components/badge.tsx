import { CATEGORY_META, LABEL_META, type EmailCategory, type EmailLabel } from "@/lib/constants";

function isKnownLabel(label: string): label is EmailLabel {
  return label in LABEL_META;
}

function isKnownCategory(category: string): category is EmailCategory {
  return category in CATEGORY_META;
}

export function LabelBadge({ label }: { label: string | null | undefined }) {
  if (!label || !isKnownLabel(label)) {
    return (
      <span className="inline-flex rounded-full border border-dashed border-stone-300 px-3 py-1 text-xs font-medium text-stone-500">
        Unlabeled
      </span>
    );
  }

  return (
    <span
      className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium ${LABEL_META[label].accent}`}
    >
      {LABEL_META[label].title}
    </span>
  );
}

export function CategoryBadge({ category }: { category: string | null | undefined }) {
  if (!category || !isKnownCategory(category)) {
    return null;
  }

  return (
    <span className="inline-flex rounded-full border border-stone-200 bg-stone-100 px-3 py-1 text-xs font-medium text-stone-700">
      {CATEGORY_META[category].title}
    </span>
  );
}

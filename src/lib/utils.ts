export function formatDateTime(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export function formatShortDate(value: string | Date) {
  const date = typeof value === "string" ? new Date(value) : value;

  return new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
  }).format(date);
}

export function toDisplayText(value: string | null | undefined) {
  const trimmed = value?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "—";
}

export function buildTrainingText(input: {
  subject: string;
  snippet: string;
  bodyText: string | null;
}) {
  return [input.subject.trim(), input.snippet.trim(), input.bodyText?.trim() ?? ""]
    .filter(Boolean)
    .join("\n");
}

export function escapeCsv(value: string | number | null | undefined) {
  const safeValue = `${value ?? ""}`.replace(/"/g, '""');
  return `"${safeValue}"`;
}

export function percent(part: number, total: number) {
  if (total === 0) {
    return 0;
  }

  return Math.round((part / total) * 100);
}

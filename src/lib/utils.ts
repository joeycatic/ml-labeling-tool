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

export function inferSuggestedLabel(input: {
  senderEmail: string;
  subject: string;
  bodyText: string | null;
}) {
  const sender = input.senderEmail.toLowerCase();
  const content = `${input.subject}\n${input.bodyText ?? ""}`.toLowerCase();

  if (
    /(deadline|exam|register|submit|required|confirm|missing|due|urgent|presentation)/.test(
      content,
    ) ||
    /(studentoffice|examoffice|career|international|professor|prof\.|library|it-support)/.test(
      sender,
    )
  ) {
    return "important";
  }

  if (
    /(seminar|workshop|event|newsletter|weekly|digest|update|career fair|internship)/.test(
      content,
    )
  ) {
    return "useful";
  }

  if (/(sale|discount|offer|buy now|shipping)/.test(content)) {
    return "irrelevant";
  }

  return null;
}

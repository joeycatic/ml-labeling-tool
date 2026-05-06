import { createHash } from "node:crypto";

type FingerprintInput = {
  senderEmail: string;
  recipientEmail?: string | null;
  subject: string;
  snippet: string;
  bodyText?: string | null;
  receivedAt: Date | string;
};

function normalizeWhitespace(value: string | null | undefined) {
  return (value ?? "").replace(/\s+/g, " ").trim().toLowerCase();
}

function normalizeDate(value: Date | string) {
  return (value instanceof Date ? value : new Date(value)).toISOString();
}

function hashSegments(parts: string[]) {
  return createHash("sha256").update(parts.join("|")).digest("hex");
}

export function buildContentFingerprint(input: FingerprintInput) {
  return hashSegments([
    normalizeWhitespace(input.senderEmail),
    normalizeWhitespace(input.recipientEmail),
    normalizeWhitespace(input.subject),
    normalizeWhitespace(input.snippet),
    normalizeWhitespace(input.bodyText),
    normalizeDate(input.receivedAt),
  ]);
}

export function buildSyntheticMessageId(input: FingerprintInput) {
  return `imported-${buildContentFingerprint(input).slice(0, 24)}`;
}

export function extractSenderDomain(senderEmail: string) {
  const [, domain = ""] = senderEmail.toLowerCase().split("@");
  return domain;
}

export function normalizeFingerprintText(value: string | null | undefined) {
  return normalizeWhitespace(value);
}

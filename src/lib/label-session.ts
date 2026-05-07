import type { EmailRecord } from "./serializers";

export const LABEL_SESSION_STORAGE_KEY = "ml-labeling-label-session";
export const LABEL_SESSION_MAX_AGE_MS = 1000 * 60 * 60 * 24 * 7;

const LABEL_SESSION_VERSION = 1;
const MAX_RECOVERY_TRAIL = 25;

export type LabelDraft = {
  category: string;
  notes: string;
};

export type LabelDraftMap = Record<number, LabelDraft>;

type LabelSessionState = {
  trail: EmailRecord[];
  index: number;
  drafts: LabelDraftMap;
  seenIds: number[];
};

export type LabelSessionSnapshot = {
  version: typeof LABEL_SESSION_VERSION;
  savedAt: string;
  trail: EmailRecord[];
  index: number;
  drafts: Record<string, LabelDraft>;
  seenIds: number[];
};

function isNullableString(value: unknown): value is string | null {
  return typeof value === "string" || value === null;
}

function isEmailRecord(value: unknown): value is EmailRecord {
  if (!value || typeof value !== "object") {
    return false;
  }

  const email = value as Record<string, unknown>;

  return (
    Number.isInteger(email.id) &&
    typeof email.messageId === "string" &&
    isNullableString(email.threadId) &&
    isNullableString(email.senderName) &&
    typeof email.senderEmail === "string" &&
    isNullableString(email.recipientEmail) &&
    typeof email.subject === "string" &&
    typeof email.snippet === "string" &&
    isNullableString(email.bodyText) &&
    Number.isInteger(email.attachmentCount) &&
    isNullableString(email.attachmentNamesJson) &&
    isNullableString(email.contentFingerprint) &&
    typeof email.receivedAt === "string" &&
    isNullableString(email.label) &&
    isNullableString(email.category) &&
    isNullableString(email.notes) &&
    isNullableString(email.labeledAt) &&
    typeof email.isLabeled === "boolean" &&
    isNullableString(email.source) &&
    typeof email.createdAt === "string" &&
    typeof email.updatedAt === "string"
  );
}

function normalizeDrafts(value: unknown): Record<string, LabelDraft> {
  if (!value || typeof value !== "object") {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).flatMap(([key, draft]) => {
      if (!/^\d+$/.test(key)) {
        return [];
      }

      if (!draft || typeof draft !== "object") {
        return [];
      }

      const nextDraft = draft as Record<string, unknown>;

      if (
        typeof nextDraft.category !== "string" ||
        typeof nextDraft.notes !== "string"
      ) {
        return [];
      }

      return [[key, { category: nextDraft.category, notes: nextDraft.notes }]];
    }),
  );
}

function normalizeSeenIds(value: unknown, trail: EmailRecord[]) {
  if (!Array.isArray(value)) {
    return Array.from(new Set(trail.map((email) => email.id)));
  }

  const ids = value.filter(
    (entry): entry is number => Number.isInteger(entry) && entry > 0,
  );

  return Array.from(new Set([...ids, ...trail.map((email) => email.id)]));
}

export function buildLabelSessionSnapshot(
  state: LabelSessionState,
): LabelSessionSnapshot {
  const trail = state.trail.filter(isEmailRecord);
  const index =
    trail.length === 0
      ? -1
      : Math.min(Math.max(state.index, 0), trail.length - 1);
  const maxStart = Math.max(0, trail.length - MAX_RECOVERY_TRAIL);
  const start =
    index < 0
      ? 0
      : Math.max(
          0,
          Math.min(index - Math.floor(MAX_RECOVERY_TRAIL / 2), maxStart),
        );
  const windowedTrail =
    index < 0 ? [] : trail.slice(start, start + MAX_RECOVERY_TRAIL);

  return {
    version: LABEL_SESSION_VERSION,
    savedAt: new Date().toISOString(),
    trail: windowedTrail,
    index: index < 0 ? -1 : index - start,
    drafts: normalizeDrafts(state.drafts),
    seenIds: normalizeSeenIds(state.seenIds, trail),
  };
}

export function parseLabelSessionSnapshot(
  rawValue: string | null,
): LabelSessionSnapshot | null {
  if (!rawValue) {
    return null;
  }

  try {
    const parsed = JSON.parse(rawValue) as Record<string, unknown>;

    if (
      parsed.version !== LABEL_SESSION_VERSION ||
      typeof parsed.savedAt !== "string" ||
      !Number.isFinite(Date.parse(parsed.savedAt))
    ) {
      return null;
    }

    const trail = Array.isArray(parsed.trail)
      ? parsed.trail.filter(isEmailRecord)
      : [];
    const index =
      Number.isInteger(parsed.index) &&
      (parsed.index as number) >= -1 &&
      (parsed.index as number) < trail.length
        ? (parsed.index as number)
        : trail.length === 0
          ? -1
          : 0;

    return {
      version: LABEL_SESSION_VERSION,
      savedAt: parsed.savedAt,
      trail,
      index,
      drafts: normalizeDrafts(parsed.drafts),
      seenIds: normalizeSeenIds(parsed.seenIds, trail),
    };
  } catch {
    return null;
  }
}

import type { Email } from "@prisma/client";

export type EmailSnapshot = {
  id: number;
  messageId: string;
  threadId: string | null;
  senderName: string | null;
  senderEmail: string;
  recipientEmail: string | null;
  subject: string;
  snippet: string;
  bodyText: string | null;
  bodyHtml: string | null;
  attachmentCount: number;
  attachmentNamesJson: string | null;
  contentFingerprint: string | null;
  receivedAt: string;
  label: string | null;
  category: string | null;
  notes: string | null;
  labeledAt: string | null;
  isLabeled: boolean;
  source: string | null;
  createdAt: string;
  updatedAt: string;
};

const MUTABLE_FIELDS = [
  "messageId",
  "threadId",
  "senderName",
  "senderEmail",
  "recipientEmail",
  "subject",
  "snippet",
  "bodyText",
  "bodyHtml",
  "attachmentCount",
  "attachmentNamesJson",
  "contentFingerprint",
  "receivedAt",
  "label",
  "category",
  "notes",
  "labeledAt",
  "isLabeled",
  "source",
] as const;

export function createEmailSnapshot(email: Email): EmailSnapshot {
  return {
    id: email.id,
    messageId: email.messageId,
    threadId: email.threadId,
    senderName: email.senderName,
    senderEmail: email.senderEmail,
    recipientEmail: email.recipientEmail,
    subject: email.subject,
    snippet: email.snippet,
    bodyText: email.bodyText,
    bodyHtml: email.bodyHtml,
    attachmentCount: email.attachmentCount,
    attachmentNamesJson: email.attachmentNamesJson,
    contentFingerprint: email.contentFingerprint,
    receivedAt: email.receivedAt.toISOString(),
    label: email.label,
    category: email.category,
    notes: email.notes,
    labeledAt: email.labeledAt?.toISOString() ?? null,
    isLabeled: email.isLabeled,
    source: email.source,
    createdAt: email.createdAt.toISOString(),
    updatedAt: email.updatedAt.toISOString(),
  };
}

export function serializeEmailSnapshot(email: Email | null) {
  return email ? JSON.stringify(createEmailSnapshot(email)) : null;
}

export function parseEmailSnapshot(snapshot: string | null) {
  return snapshot ? (JSON.parse(snapshot) as EmailSnapshot) : null;
}

export function getChangedEmailFields(
  before: EmailSnapshot | null,
  after: EmailSnapshot | null,
) {
  if (!before && !after) {
    return [] as string[];
  }

  if (!before || !after) {
    return [...MUTABLE_FIELDS];
  }

  return MUTABLE_FIELDS.filter((field) => before[field] !== after[field]);
}

export function snapshotToEmailData(snapshot: EmailSnapshot) {
  return {
    messageId: snapshot.messageId,
    threadId: snapshot.threadId,
    senderName: snapshot.senderName,
    senderEmail: snapshot.senderEmail,
    recipientEmail: snapshot.recipientEmail,
    subject: snapshot.subject,
    snippet: snapshot.snippet,
    bodyText: snapshot.bodyText,
    bodyHtml: snapshot.bodyHtml,
    attachmentCount: snapshot.attachmentCount,
    attachmentNamesJson: snapshot.attachmentNamesJson,
    contentFingerprint: snapshot.contentFingerprint,
    receivedAt: new Date(snapshot.receivedAt),
    label: snapshot.label,
    category: snapshot.category,
    notes: snapshot.notes,
    labeledAt: snapshot.labeledAt ? new Date(snapshot.labeledAt) : null,
    isLabeled: snapshot.isLabeled,
    source: snapshot.source,
  };
}

import type { Prisma, PrismaClient } from "@prisma/client";

import {
  createEmailSnapshot,
  getChangedEmailFields,
  serializeEmailSnapshot,
} from "./email-snapshots";
import type { EmailModel } from "./prisma-types";

type AuditClient = PrismaClient | Prisma.TransactionClient;

type RecordEmailChangeInput = {
  db: AuditClient;
  before: EmailModel | null;
  after: EmailModel | null;
  emailId: number;
  eventType: string;
  sourceSurface: string;
  importBatchId?: string | null;
};

export async function recordEmailChangeEvent({
  db,
  before,
  after,
  emailId,
  eventType,
  sourceSurface,
  importBatchId,
}: RecordEmailChangeInput) {
  const beforeSnapshot = before ? createEmailSnapshot(before) : null;
  const afterSnapshot = after ? createEmailSnapshot(after) : null;
  const changedFields = getChangedEmailFields(beforeSnapshot, afterSnapshot);

  await db.emailChangeEvent.create({
    data: {
      emailId,
      importBatchId: importBatchId ?? null,
      eventType,
      sourceSurface,
      changedFields: JSON.stringify(changedFields),
      beforeState: serializeEmailSnapshot(before),
      afterState: serializeEmailSnapshot(after),
      labelChanged: changedFields.includes("label"),
      emailSubject: after?.subject ?? before?.subject ?? null,
      senderEmail: after?.senderEmail ?? before?.senderEmail ?? null,
      label: after?.label ?? before?.label ?? null,
      category: after?.category ?? before?.category ?? null,
    },
  });
}

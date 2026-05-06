import type { Prisma } from "@prisma/client";

import { recordEmailChangeEvent } from "./audit";
import { CATEGORY_VALUES, LABEL_VALUES, ML_EXPORT_LABELS } from "./constants";
import { getDb } from "./db";
import { parseEmailSnapshot } from "./email-snapshots";
import { extractSenderDomain } from "./email-fingerprint";
import { notFound } from "./errors";
import { buildTrainingText, escapeCsv, percent } from "./utils";

const globalForSeedCleanup = globalThis as typeof globalThis & {
  seedCleanupPromise?: Promise<void>;
};

export type ProgressSummary = {
  total: number;
  labeled: number;
  unlabeled: number;
  skipped: number;
  progressPercentage: number;
};

export type ListEmailsInput = {
  q: string;
  label: (typeof LABEL_VALUES)[number] | "all";
  category: (typeof CATEGORY_VALUES)[number] | "all";
  status: "all" | "labeled" | "unlabeled";
  sort: "receivedAt_desc" | "receivedAt_asc";
  page: number;
  pageSize: number;
};

export type EmailHistoryEntry = {
  id: string;
  emailId: number;
  eventType: string;
  sourceSurface: string;
  changedFields: string[];
  createdAt: string;
  label: string | null;
  category: string | null;
  subject: string | null;
};

async function ensureSeedDataConsistency() {
  if (globalForSeedCleanup.seedCleanupPromise) {
    await globalForSeedCleanup.seedCleanupPromise;
    return;
  }

  const db = getDb();

  globalForSeedCleanup.seedCleanupPromise = (async () => {
    const [seedCount, nonSeedCount] = await Promise.all([
      db.email.count({ where: { source: "seed" } }),
      db.email.count({ where: { NOT: { source: "seed" } } }),
    ]);

    if (seedCount > 0 && nonSeedCount > 0) {
      await db.email.deleteMany({
        where: { source: "seed" },
      });
    }
  })();

  try {
    await globalForSeedCleanup.seedCleanupPromise;
  } finally {
    globalForSeedCleanup.seedCleanupPromise = undefined;
  }
}

function buildCounts(
  items: Array<{ key: string | null; count: number }>,
  validKeys: readonly string[],
) {
  return validKeys.map((key) => ({
    key,
    count: items.find((item) => item.key === key)?.count ?? 0,
  }));
}

function parseChangedFields(value: string) {
  try {
    return JSON.parse(value) as string[];
  } catch {
    return [];
  }
}

function buildNextLabelState(currentLabel: string | null, nextLabel?: string | null) {
  if (nextLabel === undefined) {
    return {
      label: currentLabel,
      labeledAt: undefined as Date | null | undefined,
      isLabeled: currentLabel !== null,
    };
  }

  return {
    label: nextLabel,
    labeledAt: nextLabel !== null ? new Date() : null,
    isLabeled: nextLabel !== null,
  };
}

async function mutateEmailWithAudit(input: {
  id: number;
  sourceSurface: string;
  eventType: string;
  label?: string | null;
  category?: string | null;
  notes?: string | null;
}) {
  await ensureSeedDataConsistency();
  const db = getDb();

  return db.$transaction(async (transaction) => {
    const existing = await transaction.email.findUnique({
      where: { id: input.id },
    });

    if (!existing) {
      throw notFound("Email not found.");
    }

    const nextLabelState = buildNextLabelState(existing.label, input.label);
    const updated = await transaction.email.update({
      where: { id: input.id },
      data: {
        label: nextLabelState.label,
        category:
          input.category === undefined ? existing.category : input.category ?? null,
        notes: input.notes === undefined ? existing.notes : input.notes ?? null,
        isLabeled: nextLabelState.isLabeled,
        ...(nextLabelState.labeledAt !== undefined
          ? {
              labeledAt: nextLabelState.labeledAt,
            }
          : {}),
      },
    });

    await recordEmailChangeEvent({
      db: transaction,
      before: existing,
      after: updated,
      emailId: updated.id,
      eventType: input.eventType,
      sourceSurface: input.sourceSurface,
    });

    return updated;
  });
}

export async function getProgressSummary(): Promise<ProgressSummary> {
  await ensureSeedDataConsistency();
  const db = getDb();

  const [total, labeled, skipped] = await Promise.all([
    db.email.count(),
    db.email.count({ where: { isLabeled: true } }),
    db.email.count({ where: { label: "skip" } }),
  ]);

  const unlabeled = total - labeled;

  return {
    total,
    labeled,
    unlabeled,
    skipped,
    progressPercentage: percent(labeled, total),
  };
}

export async function getNextUnlabeledEmail(excludeIds: number[] = []) {
  await ensureSeedDataConsistency();
  const db = getDb();

  return db.email.findFirst({
    where: {
      isLabeled: false,
      ...(excludeIds.length > 0
        ? {
            NOT: {
              id: {
                in: excludeIds,
              },
            },
          }
        : {}),
    },
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
  });
}

export async function getEmailById(id: number) {
  await ensureSeedDataConsistency();
  const db = getDb();

  return db.email.findUnique({
    where: { id },
  });
}

export async function getEmailHistory(id: number, take = 10): Promise<EmailHistoryEntry[]> {
  await ensureSeedDataConsistency();
  const db = getDb();

  const events = await db.emailChangeEvent.findMany({
    where: { emailId: id },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take,
  });

  return events.map((event) => ({
    id: event.id,
    emailId: event.emailId,
    eventType: event.eventType,
    sourceSurface: event.sourceSurface,
    changedFields: parseChangedFields(event.changedFields),
    createdAt: event.createdAt.toISOString(),
    label: event.label,
    category: event.category,
    subject: event.emailSubject,
  }));
}

export async function labelEmail(
  id: number,
  input: { label: string; category?: string | null; notes?: string | null },
) {
  return mutateEmailWithAudit({
    id,
    sourceSurface: "label-workbench",
    eventType: "label-update",
    label: input.label,
    category: input.category,
    notes: input.notes,
  });
}

export async function updateEmail(
  id: number,
  input: { label?: string | null; category?: string | null; notes?: string | null },
) {
  return mutateEmailWithAudit({
    id,
    sourceSurface: "email-editor",
    eventType: "email-edit",
    label: input.label,
    category: input.category,
    notes: input.notes,
  });
}

export async function bulkUpdateEmails(input: {
  ids: number[];
  label?: string | null;
  category?: string | null;
  clearCategory?: boolean;
}) {
  await ensureSeedDataConsistency();
  const db = getDb();

  return db.$transaction(async (transaction) => {
    const emails = await transaction.email.findMany({
      where: {
        id: {
          in: input.ids,
        },
      },
    });

    const emailMap = new Map(emails.map((email) => [email.id, email]));
    let updatedCount = 0;

    for (const id of input.ids) {
      const existing = emailMap.get(id);

      if (!existing) {
        continue;
      }

      const nextLabelState = buildNextLabelState(existing.label, input.label);
      const updated = await transaction.email.update({
        where: { id },
        data: {
          label: nextLabelState.label,
          category: input.clearCategory
            ? null
            : input.category === undefined
              ? existing.category
              : input.category,
          isLabeled: nextLabelState.isLabeled,
          ...(nextLabelState.labeledAt !== undefined
            ? {
                labeledAt: nextLabelState.labeledAt,
              }
            : {}),
        },
      });

      await recordEmailChangeEvent({
        db: transaction,
        before: existing,
        after: updated,
        emailId: updated.id,
        eventType: "bulk-update",
        sourceSurface: "email-bulk-editor",
      });

      updatedCount += 1;
    }

    return {
      updatedCount,
    };
  });
}

export async function listEmails(input: ListEmailsInput) {
  await ensureSeedDataConsistency();
  const db = getDb();
  const where: Prisma.EmailWhereInput = {};

  if (input.q) {
    where.OR = [
      { subject: { contains: input.q } },
      { snippet: { contains: input.q } },
      { bodyText: { contains: input.q } },
      { senderEmail: { contains: input.q } },
      { senderName: { contains: input.q } },
    ];
  }

  if (input.label !== "all") {
    where.label = input.label;
  }

  if (input.category !== "all") {
    where.category = input.category;
  }

  if (input.status === "labeled") {
    where.isLabeled = true;
  }

  if (input.status === "unlabeled") {
    where.isLabeled = false;
  }

  const totalCount = await db.email.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / input.pageSize));
  const page = Math.min(input.page, totalPages);
  const skip = (page - 1) * input.pageSize;

  const emails = await db.email.findMany({
    where,
    orderBy: {
      receivedAt: input.sort === "receivedAt_desc" ? "desc" : "asc",
    },
    skip,
    take: input.pageSize,
  });

  return {
    emails,
    totalCount,
    page,
    totalPages,
    pageSize: input.pageSize,
  };
}

export async function getStats() {
  await ensureSeedDataConsistency();
  const db = getDb();
  const summary = await getProgressSummary();

  const [labelGroups, categoryGroups, recentActivityEvents, duplicateGroups, threadedEmails, attachmentEmails, senderEmails] =
    await Promise.all([
      db.email.groupBy({
        by: ["label"],
        where: { label: { not: null } },
        _count: { _all: true },
      }),
      db.email.groupBy({
        by: ["category"],
        where: { category: { not: null } },
        _count: { _all: true },
      }),
      db.emailChangeEvent.findMany({
        where: { labelChanged: true },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        take: 8,
      }),
      db.email.groupBy({
        by: ["contentFingerprint"],
        where: { contentFingerprint: { not: null } },
        _count: { _all: true },
        having: {
          contentFingerprint: {
            _count: {
              gt: 1,
            },
          },
        },
      }),
      db.email.count({
        where: { threadId: { not: null } },
      }),
      db.email.count({
        where: { attachmentCount: { gt: 0 } },
      }),
      db.email.findMany({
        select: { senderEmail: true },
      }),
    ]);

  const labelCounts = buildCounts(
    labelGroups.map((group) => ({
      key: group.label,
      count: group._count._all,
    })),
    LABEL_VALUES,
  );

  const categoryCounts = buildCounts(
    categoryGroups.map((group) => ({
      key: group.category,
      count: group._count._all,
    })),
    CATEGORY_VALUES,
  );

  const classBalance = labelCounts.filter((item) =>
    ML_EXPORT_LABELS.includes(item.key as (typeof ML_EXPORT_LABELS)[number]),
  );
  const totalCoreLabels = classBalance.reduce((sum, item) => sum + item.count, 0);
  const maxCount = Math.max(...classBalance.map((item) => item.count), 0);
  const minCount = Math.min(...classBalance.map((item) => item.count), maxCount);

  const isImbalanced =
    totalCoreLabels > 0 &&
    (classBalance.some((item) => item.count === 0) ||
      maxCount / Math.max(totalCoreLabels, 1) > 0.6 ||
      minCount < Math.max(1, Math.floor(totalCoreLabels / 10)));

  const senderDomainCounts = new Map<string, number>();

  for (const row of senderEmails) {
    const domain = extractSenderDomain(row.senderEmail);

    if (!domain) {
      continue;
    }

    senderDomainCounts.set(domain, (senderDomainCounts.get(domain) ?? 0) + 1);
  }

  const topSenderDomains = [...senderDomainCounts.entries()]
    .sort((left, right) => right[1] - left[1])
    .slice(0, 5)
    .map(([domain, count]) => ({ domain, count }));

  const recentActivity = recentActivityEvents.map((event) => {
    const afterSnapshot = parseEmailSnapshot(event.afterState);
    const beforeSnapshot = parseEmailSnapshot(event.beforeState);
    const snapshot = afterSnapshot ?? beforeSnapshot;

    return {
      id: event.id,
      emailId: event.emailId,
      label: event.label,
      category: event.category,
      senderEmail: snapshot?.senderEmail ?? event.senderEmail ?? "",
      subject: snapshot?.subject ?? event.emailSubject ?? "",
      labeledAt: event.createdAt,
      updatedAt: event.createdAt,
    };
  });

  return {
    summary,
    labelCounts,
    categoryCounts,
    recentActivity,
    classBalance,
    topSenderDomains,
    duplicateClusterCount: duplicateGroups.length,
    threadedEmailCount: threadedEmails,
    attachmentEmailCount: attachmentEmails,
    balanceWarning: isImbalanced
      ? "Your dataset is imbalanced. Try to label more examples for the smaller classes before training."
      : null,
  };
}

export type ExportRow = {
  id: number;
  messageId: string;
  text: string;
  label: string;
  category: string;
  subject: string;
  senderEmail: string;
  snippet: string;
  bodyText: string;
  receivedAt: string;
};

export async function getExportRows(includeSkipped = false): Promise<ExportRow[]> {
  await ensureSeedDataConsistency();
  const db = getDb();
  const labels = includeSkipped ? [...ML_EXPORT_LABELS, "skip"] : [...ML_EXPORT_LABELS];

  const emails = await db.email.findMany({
    where: {
      label: { in: labels },
      NOT: {
        AND: [
          { subject: "" },
          {
            OR: [{ bodyText: null }, { bodyText: "" }],
          },
        ],
      },
    },
    orderBy: [{ receivedAt: "asc" }, { id: "asc" }],
  });

  return emails.map((email) => ({
    id: email.id,
    messageId: email.messageId,
    text: buildTrainingText(email),
    label: email.label ?? "",
    category: email.category ?? "",
    subject: email.subject,
    senderEmail: email.senderEmail,
    snippet: email.snippet,
    bodyText: email.bodyText ?? "",
    receivedAt: email.receivedAt.toISOString(),
  }));
}

export function exportRowsToCsv(rows: ExportRow[]) {
  const headers = [
    "text",
    "label",
    "category",
    "subject",
    "senderEmail",
    "receivedAt",
    "id",
    "messageId",
    "snippet",
    "bodyText",
  ];

  const body = rows.map((row) =>
    [
      escapeCsv(row.text),
      escapeCsv(row.label),
      escapeCsv(row.category),
      escapeCsv(row.subject),
      escapeCsv(row.senderEmail),
      escapeCsv(row.receivedAt),
      escapeCsv(row.id),
      escapeCsv(row.messageId),
      escapeCsv(row.snippet),
      escapeCsv(row.bodyText),
    ].join(","),
  );

  return [headers.join(","), ...body].join("\n");
}

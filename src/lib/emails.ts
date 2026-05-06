import type { Prisma } from "@prisma/client";

import { CATEGORY_VALUES, LABEL_VALUES, ML_EXPORT_LABELS } from "./constants";
import { getDb } from "./db";
import { buildTrainingText, escapeCsv, percent } from "./utils";

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

export async function getProgressSummary(): Promise<ProgressSummary> {
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
  const db = getDb();

  return db.email.findUnique({
    where: { id },
  });
}

export async function labelEmail(
  id: number,
  input: { label: string; category?: string | null; notes?: string | null },
) {
  const db = getDb();

  return db.email.update({
    where: { id },
    data: {
      label: input.label,
      category: input.category ?? null,
      notes: input.notes ?? null,
      isLabeled: true,
      labeledAt: new Date(),
    },
  });
}

export async function updateEmail(
  id: number,
  input: { label?: string | null; category?: string | null; notes?: string | null },
) {
  const db = getDb();
  const nextLabel = input.label ?? null;

  return db.email.update({
    where: { id },
    data: {
      label: nextLabel,
      category: input.category ?? null,
      notes: input.notes ?? null,
      isLabeled: nextLabel !== null,
      labeledAt: nextLabel !== null ? new Date() : null,
    },
  });
}

export async function listEmails(input: ListEmailsInput) {
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

function buildCounts(
  items: Array<{ key: string | null; count: number }>,
  validKeys: readonly string[],
) {
  return validKeys.map((key) => ({
    key,
    count: items.find((item) => item.key === key)?.count ?? 0,
  }));
}

export async function getStats() {
  const db = getDb();
  const summary = await getProgressSummary();

  const [labelGroups, categoryGroups, recentActivity] = await Promise.all([
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
    db.email.findMany({
      where: { labeledAt: { not: null } },
      orderBy: { labeledAt: "desc" },
      take: 8,
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

  return {
    summary,
    labelCounts,
    categoryCounts,
    recentActivity,
    classBalance,
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

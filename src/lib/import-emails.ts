import Papa from "papaparse";
import type { Email, Prisma, PrismaClient } from "@prisma/client";

import { recordEmailChangeEvent } from "./audit";
import { getDb } from "./db";
import {
  buildContentFingerprint,
  buildSyntheticMessageId,
} from "./email-fingerprint";
import { badRequest } from "./errors";
import { parseMailboxImportWithReport } from "./mail-import";
import { importEmailRowSchema } from "./validation";

type ImportDb = PrismaClient | Prisma.TransactionClient;
type RawImportRow = Record<string, unknown>;
type ParsedRow = ReturnType<typeof importEmailRowSchema.parse>;
type PreparedImportRow = ParsedRow & {
  messageId: string;
  contentFingerprint: string;
  source: string;
};

export type ImportIssue = {
  index?: number;
  fileName?: string;
  messageIndex?: number;
  message: string;
};

export type ImportPreviewRow = {
  messageId: string;
  senderEmail: string;
  subject: string;
  receivedAt: string;
  action: "create" | "update";
  fileName?: string;
};

type ParsedImportPayload = {
  rawRows: unknown[];
  issues: ImportIssue[];
  fileCount: number;
  fileNames: string[];
  formatLabel: string;
};

export type ImportPlan = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  matchedExistingRows: number;
  projectedCreated: number;
  projectedUpdated: number;
  previewRows: ImportPreviewRow[];
  sampleErrors: ImportIssue[];
  fileCount: number;
  fileNames: string[];
  formatLabel: string;
  preparedRows: PreparedImportRow[];
  shouldReplaceSeedData: boolean;
};

type CommitImportResult = {
  batchId: string;
  imported: number;
  created: number;
  updated: number;
  removedSeedCount: number;
};

const SAMPLE_ERROR_LIMIT = 8;
const PREVIEW_ROW_LIMIT = 6;

function normalizeValue(value: unknown) {
  if (typeof value === "string") {
    return value.trim();
  }

  return value;
}

function looksLikeJson(content: string) {
  const trimmed = content.trim();
  return trimmed.startsWith("{") || trimmed.startsWith("[");
}

function looksLikeMbox(content: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  return normalized.startsWith("From ") && /\n(?:Message-ID:|Date:|Subject:|From:)/.test(normalized);
}

function looksLikeEml(content: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  return /^(Message-ID:|Date:|From:|Subject:)/m.test(normalized) && !normalized.startsWith("From ");
}

function looksLikeCsv(content: string) {
  const firstLine = content.split(/\r?\n/, 1)[0]?.trim() ?? "";
  return (
    firstLine.includes(",") &&
    /(messageId|message_id|senderEmail|sender_email|subject|receivedAt|received_at)/i.test(
      firstLine,
    )
  );
}

function mapRow(row: RawImportRow) {
  return {
    messageId: normalizeValue(row.messageId ?? row["message_id"]),
    threadId: normalizeValue(row.threadId ?? row["thread_id"]),
    senderName: normalizeValue(row.senderName ?? row["sender_name"]),
    senderEmail: normalizeValue(row.senderEmail ?? row["sender_email"]),
    recipientEmail: normalizeValue(row.recipientEmail ?? row["recipient_email"]),
    subject: normalizeValue(row.subject) ?? "",
    snippet: normalizeValue(row.snippet) ?? "",
    bodyText: normalizeValue(row.bodyText ?? row["body_text"]),
    bodyHtml: normalizeValue(row.bodyHtml ?? row["body_html"]),
    attachmentCount:
      normalizeValue(row.attachmentCount ?? row["attachment_count"]) ?? 0,
    attachmentNamesJson:
      normalizeValue(row.attachmentNamesJson ?? row["attachment_names_json"]) ?? null,
    contentFingerprint:
      normalizeValue(row.contentFingerprint ?? row["content_fingerprint"]) ?? null,
    receivedAt: normalizeValue(row.receivedAt ?? row["received_at"]),
    label: normalizeValue(row.label),
    category: normalizeValue(row.category),
    notes: normalizeValue(row.notes),
    source: normalizeValue(row.source) ?? "import",
  };
}

function coerceRowForImport(rawRow: unknown) {
  return mapRow(rawRow as RawImportRow);
}

async function parseCsvContent(content: string) {
  const result = await new Promise<Papa.ParseResult<RawImportRow>>((resolve, reject) => {
    Papa.parse<RawImportRow>(content, {
      header: true,
      skipEmptyLines: true,
      complete: resolve,
      error: reject,
    });
  });

  const issues = result.errors.map((error) => ({
    index: typeof error.row === "number" ? error.row + 1 : undefined,
    message: error.message,
  }));

  return {
    rows: result.data,
    issues,
  };
}

function parseJsonContent(content: string) {
  const parsedJson = JSON.parse(content) as unknown;
  const rows = Array.isArray(parsedJson)
    ? parsedJson
    : typeof parsedJson === "object" &&
        parsedJson !== null &&
        Array.isArray((parsedJson as { emails?: unknown[] }).emails)
      ? (parsedJson as { emails: unknown[] }).emails
      : null;

  if (!rows) {
    throw badRequest("JSON must be an array or an object with an `emails` array.");
  }

  return rows;
}

async function parseSingleFile(file: File): Promise<ParsedImportPayload> {
  const content = await file.text();
  const lowerName = file.name.toLowerCase();

  if (lowerName.endsWith(".json") || looksLikeJson(content)) {
    return {
      rawRows: parseJsonContent(content),
      issues: [],
      fileCount: 1,
      fileNames: [file.name],
      formatLabel: "json",
    };
  }

  if (lowerName.endsWith(".csv") || looksLikeCsv(content)) {
    const parsedCsv = await parseCsvContent(content);

    return {
      rawRows: parsedCsv.rows,
      issues: parsedCsv.issues.map((issue) => ({ ...issue, fileName: file.name })),
      fileCount: 1,
      fileNames: [file.name],
      formatLabel: "csv",
    };
  }

  if (lowerName.endsWith(".mbox") || looksLikeMbox(content)) {
    const parsedMailbox = await parseMailboxImportWithReport({
      format: "mbox",
      fileName: file.name,
      content,
    });

    return {
      rawRows: parsedMailbox.rows,
      issues: parsedMailbox.issues,
      fileCount: 1,
      fileNames: [file.name],
      formatLabel: "mbox",
    };
  }

  if (lowerName.endsWith(".eml") || looksLikeEml(content)) {
    const parsedMailbox = await parseMailboxImportWithReport({
      format: "eml",
      fileName: file.name,
      content,
    });

    return {
      rawRows: parsedMailbox.rows,
      issues: parsedMailbox.issues,
      fileCount: 1,
      fileNames: [file.name],
      formatLabel: "eml",
    };
  }

  throw badRequest(
    "Unsupported file type. Use .csv, .json, .eml, or .mbox. Extensionless mailbox files are supported when they contain standard mail headers.",
  );
}

async function parseMultipleEmlFiles(files: File[]): Promise<ParsedImportPayload> {
  const rawRows: unknown[] = [];
  const issues: ImportIssue[] = [];

  for (const file of files) {
    const content = await file.text();
    const parsedMailbox = await parseMailboxImportWithReport({
      format: "eml",
      fileName: file.name,
      content,
    });

    rawRows.push(...parsedMailbox.rows);
    issues.push(...parsedMailbox.issues);
  }

  return {
    rawRows,
    issues,
    fileCount: files.length,
    fileNames: files.map((file) => file.name),
    formatLabel: "multi-eml",
  };
}

function normalizeFileList(formData: FormData) {
  const directFiles = formData
    .getAll("files")
    .filter((value): value is File => value instanceof File && value.size > 0);
  const singleFile = formData.get("file");
  const normalizedSingle =
    singleFile instanceof File && singleFile.size > 0 ? [singleFile] : [];

  const files = directFiles.length > 0 ? directFiles : normalizedSingle;

  if (files.length === 0) {
    throw badRequest("Missing file upload.");
  }

  return files;
}

export async function parseImportRequest(request: Request): Promise<ParsedImportPayload> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    const formData = await request.formData();
    const files = normalizeFileList(formData);

    if (files.length === 1) {
      return parseSingleFile(files[0]);
    }

    const allLookLikeEml = files.every((file) => file.name.toLowerCase().endsWith(".eml"));

    if (!allLookLikeEml) {
      throw badRequest(
        "Multiple uploads are only supported for .eml files. Use a single structured file for CSV, JSON, or MBOX.",
      );
    }

    return parseMultipleEmlFiles(files);
  }

  const body = (await request.json()) as
    | { emails?: unknown[] }
    | { format?: "eml" | "mbox"; fileName?: string; content?: string };

  if ("emails" in body && Array.isArray(body.emails)) {
    return {
      rawRows: body.emails,
      issues: [],
      fileCount: 1,
      fileNames: ["json-payload"],
      formatLabel: "json-payload",
    };
  }

  if (
    "format" in body &&
    (body.format === "eml" || body.format === "mbox") &&
    typeof body.fileName === "string" &&
    typeof body.content === "string"
  ) {
    const parsedMailbox = await parseMailboxImportWithReport({
      format: body.format,
      fileName: body.fileName,
      content: body.content,
    });

    return {
      rawRows: parsedMailbox.rows,
      issues: parsedMailbox.issues,
      fileCount: 1,
      fileNames: [body.fileName],
      formatLabel: body.format,
    };
  }

  throw badRequest("Unsupported import payload.");
}

function prepareImportRow(rawRow: unknown) {
  const parsed = importEmailRowSchema.safeParse(coerceRowForImport(rawRow));

  if (!parsed.success) {
    return {
      success: false as const,
      error: parsed.error.flatten(),
    };
  }

  const row = parsed.data;
  const contentFingerprint =
    row.contentFingerprint ??
    buildContentFingerprint({
      senderEmail: row.senderEmail,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      snippet: row.snippet,
      bodyText: row.bodyText,
      receivedAt: row.receivedAt,
    });
  const messageId =
    row.messageId?.trim() ||
    buildSyntheticMessageId({
      senderEmail: row.senderEmail,
      recipientEmail: row.recipientEmail,
      subject: row.subject,
      snippet: row.snippet,
      bodyText: row.bodyText,
      receivedAt: row.receivedAt,
    });

  return {
    success: true as const,
    row: {
      ...row,
      messageId,
      attachmentCount: row.attachmentCount ?? 0,
      attachmentNamesJson: row.attachmentNamesJson ?? null,
      contentFingerprint,
      source: row.source ?? "import",
    },
  };
}

export async function buildImportPlan(
  payload: ParsedImportPayload,
  db: ImportDb = getDb(),
): Promise<ImportPlan> {
  const issues = [...payload.issues];
  const uniqueRows = new Map<string, PreparedImportRow>();
  let duplicateRows = 0;

  for (const [index, rawRow] of payload.rawRows.entries()) {
    const prepared = prepareImportRow(rawRow);

    if (!prepared.success) {
      issues.push({
        index: index + 1,
        message: JSON.stringify(prepared.error.fieldErrors),
      });
      continue;
    }

    if (uniqueRows.has(prepared.row.messageId)) {
      duplicateRows += 1;
      continue;
    }

    uniqueRows.set(prepared.row.messageId, prepared.row);
  }

  const preparedRows = [...uniqueRows.values()];
  const existingEmails =
    preparedRows.length > 0
      ? await db.email.findMany({
          where: {
            messageId: {
              in: preparedRows.map((row) => row.messageId),
            },
          },
          select: {
            messageId: true,
          },
        })
      : [];
  const existingMessageIds = new Set(existingEmails.map((email) => email.messageId));

  return {
    totalRows: payload.rawRows.length + payload.issues.length,
    validRows: preparedRows.length,
    invalidRows: issues.length,
    duplicateRows,
    matchedExistingRows: existingMessageIds.size,
    projectedCreated: preparedRows.filter((row) => !existingMessageIds.has(row.messageId)).length,
    projectedUpdated: preparedRows.filter((row) => existingMessageIds.has(row.messageId)).length,
    previewRows: preparedRows.slice(0, PREVIEW_ROW_LIMIT).map((row) => ({
      messageId: row.messageId,
      senderEmail: row.senderEmail,
      subject: row.subject,
      receivedAt: row.receivedAt.toISOString(),
      action: existingMessageIds.has(row.messageId) ? "update" : "create",
    })),
    sampleErrors: issues.slice(0, SAMPLE_ERROR_LIMIT),
    fileCount: payload.fileCount,
    fileNames: payload.fileNames,
    formatLabel: payload.formatLabel,
    preparedRows,
    shouldReplaceSeedData: preparedRows.some((row) => row.source !== "seed"),
  };
}

export function serializeImportPlan(plan: ImportPlan) {
  return {
    totalRows: plan.totalRows,
    validRows: plan.validRows,
    invalidRows: plan.invalidRows,
    duplicateRows: plan.duplicateRows,
    matchedExistingRows: plan.matchedExistingRows,
    projectedCreated: plan.projectedCreated,
    projectedUpdated: plan.projectedUpdated,
    previewRows: plan.previewRows,
    sampleErrors: plan.sampleErrors,
    fileCount: plan.fileCount,
    fileNames: plan.fileNames,
    formatLabel: plan.formatLabel,
  };
}

function buildEmailWriteData(row: PreparedImportRow) {
  const label = row.label ?? null;

  return {
    messageId: row.messageId,
    threadId: row.threadId ?? null,
    senderName: row.senderName ?? null,
    senderEmail: row.senderEmail,
    recipientEmail: row.recipientEmail ?? null,
    subject: row.subject,
    snippet: row.snippet,
    bodyText: row.bodyText ?? null,
    bodyHtml: row.bodyHtml ?? null,
    attachmentCount: row.attachmentCount ?? 0,
    attachmentNamesJson: row.attachmentNamesJson ?? null,
    contentFingerprint: row.contentFingerprint,
    receivedAt: row.receivedAt,
    label,
    category: row.category ?? null,
    notes: row.notes ?? null,
    source: row.source,
    isLabeled: label !== null,
    labeledAt: label !== null ? new Date() : null,
  };
}

export async function commitImportPlan(
  plan: ImportPlan,
  sourceSurface = "import-ui",
  db: PrismaClient = getDb(),
): Promise<CommitImportResult> {
  if (plan.validRows === 0) {
    throw badRequest("The import payload did not contain any valid emails.", serializeImportPlan(plan));
  }

  if (plan.invalidRows > 0) {
    throw badRequest("Fix invalid rows before importing.", serializeImportPlan(plan));
  }

  return db.$transaction(async (transaction) => {
    const batch = await transaction.importBatch.create({
      data: {
        sourceSurface,
        fileCount: plan.fileCount,
        rowCount: plan.validRows,
      },
    });
    let created = 0;
    let updated = 0;
    let removedSeedCount = 0;

    if (plan.shouldReplaceSeedData) {
      const seedEmails = await transaction.email.findMany({
        where: { source: "seed" },
      });

      if (seedEmails.length > 0) {
        for (const seedEmail of seedEmails) {
          await recordEmailChangeEvent({
            db: transaction,
            before: seedEmail,
            after: null,
            emailId: seedEmail.id,
            eventType: "import-delete",
            sourceSurface,
            importBatchId: batch.id,
          });
        }

        const deletedSeeds = await transaction.email.deleteMany({
          where: { source: "seed" },
        });

        removedSeedCount = deletedSeeds.count;
      }
    }

    for (const row of plan.preparedRows) {
      const existing = await transaction.email.findUnique({
        where: { messageId: row.messageId },
      });
      const data = buildEmailWriteData(row);
      let after: Email;

      if (existing) {
        after = await transaction.email.update({
          where: { id: existing.id },
          data,
        });
        updated += 1;
      } else {
        after = await transaction.email.create({
          data,
        });
        created += 1;
      }

      await recordEmailChangeEvent({
        db: transaction,
        before: existing,
        after,
        emailId: after.id,
        eventType: existing ? "import-update" : "import-create",
        sourceSurface,
        importBatchId: batch.id,
      });
    }

    await transaction.importBatch.update({
      where: { id: batch.id },
      data: {
        createdCount: created,
        updatedCount: updated,
        deletedCount: removedSeedCount,
        removedSeedCount,
      },
    });

    return {
      batchId: batch.id,
      imported: plan.validRows,
      created,
      updated,
      removedSeedCount,
    };
  });
}

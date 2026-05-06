import { z } from "zod";

import { CATEGORY_VALUES, LABEL_VALUES } from "./constants";

const emptyToNull = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? null : trimmed;
};

const emptyToUndefined = (value: unknown) => {
  if (typeof value !== "string") {
    return value;
  }

  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
};

const parseBoolean = (value: unknown) => value === "1" || value === "true" || value === true;

export const labelSchema = z.enum(LABEL_VALUES);
export const categorySchema = z.enum(CATEGORY_VALUES);

export const labelEmailSchema = z.object({
  label: labelSchema,
  category: z.preprocess(emptyToNull, categorySchema.nullable().optional()),
  notes: z.preprocess(
    emptyToNull,
    z.string().max(500).nullable().optional(),
  ),
});

export const updateEmailSchema = z.object({
  label: z.preprocess(emptyToNull, labelSchema.nullable().optional()),
  category: z.preprocess(emptyToNull, categorySchema.nullable().optional()),
  notes: z.preprocess(
    emptyToNull,
    z.string().max(500).nullable().optional(),
  ),
});

export const listEmailsQuerySchema = z.object({
  q: z.preprocess(emptyToUndefined, z.string().max(200).optional().default("")),
  label: z.preprocess(
    emptyToUndefined,
    z.union([labelSchema, z.literal("all")]).optional().default("all"),
  ),
  category: z.preprocess(
    emptyToUndefined,
    z.union([categorySchema, z.literal("all")]).optional().default("all"),
  ),
  status: z
    .union([z.literal("all"), z.literal("labeled"), z.literal("unlabeled")])
    .optional()
    .default("all"),
  sort: z
    .union([z.literal("receivedAt_desc"), z.literal("receivedAt_asc")])
    .optional()
    .default("receivedAt_desc"),
  page: z.coerce.number().int().min(1).optional().default(1),
  pageSize: z.coerce.number().int().min(1).max(50).optional().default(12),
  emailId: z.coerce.number().int().positive().optional(),
});

export const exportQuerySchema = z.object({
  includeSkipped: z.preprocess(parseBoolean, z.boolean().optional().default(false)),
});

export const nextEmailQuerySchema = z.object({
  exclude: z.string().optional().default(""),
});

export const emailIdParamsSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const bulkUpdateEmailsSchema = z
  .object({
    ids: z.array(z.coerce.number().int().positive()).min(1).max(250),
    label: z.preprocess(emptyToNull, labelSchema.nullable().optional()),
    category: z.preprocess(emptyToNull, categorySchema.nullable().optional()),
    clearCategory: z.boolean().optional().default(false),
  })
  .refine((value) => value.label !== undefined || value.category !== undefined || value.clearCategory, {
    message: "At least one bulk change is required.",
    path: ["label"],
  });

const dateSchema = z.preprocess((value) => {
  if (value instanceof Date) {
    return value;
  }

  if (typeof value === "string" && value.trim().length > 0) {
    return new Date(value);
  }

  return value;
}, z.date());

export const importEmailRowSchema = z.object({
  messageId: z.preprocess(emptyToUndefined, z.string().max(255).optional()),
  threadId: z.preprocess(emptyToNull, z.string().max(255).nullable().optional()),
  senderName: z.preprocess(emptyToNull, z.string().max(255).nullable().optional()),
  senderEmail: z.string().email(),
  recipientEmail: z.preprocess(emptyToNull, z.string().email().nullable().optional()),
  subject: z.preprocess(emptyToUndefined, z.string().max(500).optional().default("")),
  snippet: z.preprocess(emptyToUndefined, z.string().max(1000).optional().default("")),
  bodyText: z.preprocess(emptyToNull, z.string().nullable().optional()),
  bodyHtml: z.preprocess(emptyToNull, z.string().nullable().optional()),
  attachmentCount: z.coerce.number().int().min(0).optional().default(0),
  attachmentNamesJson: z.preprocess(emptyToNull, z.string().nullable().optional()),
  contentFingerprint: z.preprocess(emptyToNull, z.string().nullable().optional()),
  receivedAt: dateSchema,
  label: z.preprocess(emptyToNull, labelSchema.nullable().optional()),
  category: z.preprocess(emptyToNull, categorySchema.nullable().optional()),
  notes: z.preprocess(emptyToNull, z.string().max(500).nullable().optional()),
  source: z.preprocess(emptyToNull, z.string().max(120).nullable().optional()),
});

export const importEmailsSchema = z.object({
  emails: z.array(importEmailRowSchema).min(1).max(10000),
});

export const importMailboxSchema = z.object({
  format: z.enum(["eml", "mbox"]),
  fileName: z.string().min(1).max(255),
  content: z.string().min(1).max(15_000_000),
});

export const importRequestSchema = z.union([
  importEmailsSchema,
  importMailboxSchema,
]);

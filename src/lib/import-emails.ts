import { getDb } from "./db";
import { importEmailRowSchema } from "./validation";

type ImportEmailInput = Array<ReturnType<typeof importEmailRowSchema.parse>>;

function buildFallbackMessageId(email: {
  senderEmail: string;
  subject: string;
  receivedAt: Date;
  bodyText: string | null;
}, index: number) {
  const seed = [
    email.senderEmail.trim().toLowerCase(),
    email.subject.trim().toLowerCase(),
    email.receivedAt.toISOString(),
    email.bodyText?.slice(0, 40).trim().toLowerCase() ?? "",
    String(index),
  ].join("|");

  const normalized = seed.replace(/[^a-z0-9|:-]/g, "-");
  return `imported-${normalized}`;
}

export async function importEmails(rows: ImportEmailInput) {
  const db = getDb();
  let created = 0;
  let updated = 0;

  for (const [index, rawRow] of rows.entries()) {
    const email = importEmailRowSchema.parse(rawRow);
    const label = email.label ?? null;
    const category = email.category ?? null;
    const notes = email.notes ?? null;
    const source = email.source ?? "import";
    const messageId =
      email.messageId?.trim() ||
      buildFallbackMessageId(
        {
          senderEmail: email.senderEmail,
          subject: email.subject,
          receivedAt: email.receivedAt,
          bodyText: email.bodyText ?? null,
        },
        index,
      );

    const existing = await db.email.findUnique({
      where: { messageId },
      select: { id: true },
    });

    await db.email.upsert({
      where: { messageId },
      update: {
        threadId: email.threadId ?? null,
        senderName: email.senderName ?? null,
        senderEmail: email.senderEmail,
        recipientEmail: email.recipientEmail ?? null,
        subject: email.subject,
        snippet: email.snippet,
        bodyText: email.bodyText ?? null,
        bodyHtml: email.bodyHtml ?? null,
        receivedAt: email.receivedAt,
        label,
        category,
        notes,
        source,
        isLabeled: label !== null,
        labeledAt: label ? new Date() : null,
      },
      create: {
        messageId,
        threadId: email.threadId ?? null,
        senderName: email.senderName ?? null,
        senderEmail: email.senderEmail,
        recipientEmail: email.recipientEmail ?? null,
        subject: email.subject,
        snippet: email.snippet,
        bodyText: email.bodyText ?? null,
        bodyHtml: email.bodyHtml ?? null,
        receivedAt: email.receivedAt,
        label,
        category,
        notes,
        source,
        isLabeled: label !== null,
        labeledAt: label ? new Date() : null,
      },
    });

    if (existing) {
      updated += 1;
    } else {
      created += 1;
    }
  }

  return {
    imported: rows.length,
    created,
    updated,
  };
}

import { simpleParser } from "mailparser";
import type { AddressObject } from "mailparser";

import { importEmailRowSchema } from "./validation";

type ParsedImportRow = ReturnType<typeof importEmailRowSchema.parse>;
type MailParseIssue = {
  fileName?: string;
  messageIndex?: number;
  message: string;
};

function buildSnippet(text: string | undefined) {
  const compact = (text ?? "").replace(/\s+/g, " ").trim();
  return compact.slice(0, 220);
}

function firstAddress(input: AddressObject | AddressObject[] | undefined) {
  if (!input) {
    return null;
  }

  if (Array.isArray(input)) {
    return input[0]?.value[0] ?? null;
  }

  return input.value[0] ?? null;
}

async function parseEmlMessage(
  rawMessage: string,
  source: "eml-import" | "mbox-import",
): Promise<ParsedImportRow | null> {
  const parsed = await simpleParser(rawMessage);
  const sender = firstAddress(parsed.from);

  if (!sender?.address) {
    return null;
  }

  const recipient = firstAddress(parsed.to);
  const html =
    typeof parsed.html === "string"
      ? parsed.html
      : parsed.html
        ? String(parsed.html)
        : null;
  const attachmentNames = parsed.attachments
    .map((attachment) => attachment.filename?.trim())
    .filter((attachmentName): attachmentName is string => Boolean(attachmentName));

  return importEmailRowSchema.parse({
    messageId: parsed.messageId ?? undefined,
    threadId: parsed.inReplyTo ?? undefined,
    senderName: sender.name ?? undefined,
    senderEmail: sender.address,
    recipientEmail: recipient?.address ?? undefined,
    subject: parsed.subject ?? "",
    snippet: buildSnippet(parsed.text ?? undefined),
    bodyText: parsed.text ?? null,
    bodyHtml: html,
    attachmentCount: parsed.attachments.length,
    attachmentNamesJson:
      attachmentNames.length > 0 ? JSON.stringify(attachmentNames) : null,
    receivedAt: parsed.date ?? new Date(),
    source,
  });
}

function splitMbox(content: string) {
  const normalized = content.replace(/\r\n/g, "\n");
  const lines = normalized.split("\n");
  const messages: string[] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.startsWith("From ") && current.length > 0) {
      messages.push(current.join("\n").trim());
      current = [];
      continue;
    }

    current.push(line);
  }

  if (current.length > 0) {
    messages.push(current.join("\n").trim());
  }

  return messages.filter((message) => /^(From|Date|Subject):/m.test(message));
}

export async function parseMailboxImport(input: {
  format: "eml" | "mbox";
  fileName?: string;
  content: string;
}) {
  if (input.format === "eml") {
    const parsed = await parseEmlMessage(input.content, "eml-import");
    return parsed ? [parsed] : [];
  }

  const messages = splitMbox(input.content);
  const parsedRows = await Promise.all(
    messages.map((message) => parseEmlMessage(message, "mbox-import")),
  );

  return parsedRows.filter((row): row is ParsedImportRow => row !== null);
}

export async function parseMailboxImportWithReport(input: {
  format: "eml" | "mbox";
  fileName?: string;
  content: string;
}) {
  const rows: ParsedImportRow[] = [];
  const issues: MailParseIssue[] = [];
  let totalMessages = 0;

  if (input.format === "eml") {
    totalMessages = 1;

    try {
      const parsed = await parseEmlMessage(
        input.content,
        "eml-import",
      );

      if (parsed) {
        rows.push(parsed);
      } else {
        issues.push({
          fileName: input.fileName,
          message: "Could not extract a sender address from the EML file.",
        });
      }
    } catch (error) {
      issues.push({
        fileName: input.fileName,
        message: error instanceof Error ? error.message : "Failed to parse EML file.",
      });
    }

    return { rows, issues, totalMessages };
  }

  const messages = splitMbox(input.content);
  totalMessages = messages.length;

  for (const [index, message] of messages.entries()) {
    try {
      const parsed = await parseEmlMessage(
        message,
        "mbox-import",
      );

      if (parsed) {
        rows.push(parsed);
      } else {
        issues.push({
          fileName: input.fileName,
          messageIndex: index + 1,
          message: "Could not extract a sender address from the mailbox message.",
        });
      }
    } catch (error) {
      issues.push({
        fileName: input.fileName,
        messageIndex: index + 1,
        message:
          error instanceof Error ? error.message : "Failed to parse mailbox message.",
      });
    }
  }

  return { rows, issues, totalMessages };
}

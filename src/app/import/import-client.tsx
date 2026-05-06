"use client";

import {
  AlertCircle,
  CheckCircle2,
  FileArchive,
  FileJson2,
  FileSpreadsheet,
  LoaderCircle,
  Mail,
  Sparkles,
  UploadCloud,
} from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import Papa from "papaparse";
import { useRouter } from "next/navigation";

type RawRow = Record<string, unknown>;

type ParsedState = {
  fileName: string;
  format: "csv" | "json" | "eml" | "mbox";
  estimatedCount: number | null;
  rows?: RawRow[];
  file?: File;
};

function formatBytes(value: number) {
  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
}

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

async function readHead(file: File, bytes = 32_768) {
  return file.slice(0, bytes).text();
}

function mapRow(row: RawRow) {
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
    receivedAt: normalizeValue(row.receivedAt ?? row["received_at"]),
    label: normalizeValue(row.label),
    category: normalizeValue(row.category),
    notes: normalizeValue(row.notes),
    source: normalizeValue(row.source) ?? "import",
  };
}

export function ImportClient() {
  const router = useRouter();
  const [parsed, setParsed] = useState<ParsedState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPreparing, setIsPreparing] = useState(false);
  const [result, setResult] = useState<{
    imported: number;
    created: number;
    updated: number;
    removedSeedCount: number;
  } | null>(null);
  const [isPending, startTransition] = useTransition();

  const previewRows = useMemo(
    () => parsed?.rows?.slice(0, 3).map((row) => mapRow(row)) ?? [],
    [parsed],
  );

  const hasStructuredRows = parsed?.rows !== undefined;
  const FormatIcon =
    parsed?.format === "csv"
      ? FileSpreadsheet
      : parsed?.format === "json"
        ? FileJson2
        : parsed?.format === "mbox"
          ? FileArchive
          : Mail;

  const handleFile = async (file: File) => {
    setError(null);
    setResult(null);
    setParsed({
      fileName: file.name,
      format: "mbox",
      estimatedCount: null,
      file,
    });
    setIsPreparing(true);

    try {
      const lowerName = file.name.toLowerCase();
      const head = await readHead(file);

      if (lowerName.endsWith(".json") || looksLikeJson(head)) {
        const content = await file.text();
        const parsedJson = JSON.parse(content) as unknown;
        const rows = Array.isArray(parsedJson)
          ? parsedJson
          : typeof parsedJson === "object" &&
              parsedJson !== null &&
              Array.isArray((parsedJson as { emails?: unknown[] }).emails)
            ? (parsedJson as { emails: unknown[] }).emails
            : null;

        if (!rows) {
          throw new Error("JSON must be an array or an object with an `emails` array.");
        }

        setParsed({
          fileName: file.name,
          format: "json",
          estimatedCount: rows.length,
          rows: rows as RawRow[],
        });
        return;
      }

      if (lowerName.endsWith(".csv") || looksLikeCsv(head)) {
        const content = await file.text();
        const result = await new Promise<Papa.ParseResult<RawRow>>((resolve, reject) => {
          Papa.parse<RawRow>(content, {
            header: true,
            skipEmptyLines: true,
            complete: resolve,
            error: reject,
          });
        });

        if (result.errors.length > 0) {
          throw new Error(result.errors[0]?.message ?? "Failed to parse CSV.");
        }

        setParsed({
          fileName: file.name,
          format: "csv",
          estimatedCount: result.data.length,
          rows: result.data,
        });
        return;
      }

      if (
        lowerName.endsWith(".eml") ||
        lowerName.endsWith(".mbox") ||
        looksLikeEml(head) ||
        looksLikeMbox(head)
      ) {
        const format =
          lowerName.endsWith(".eml") || looksLikeEml(head) ? "eml" : "mbox";

        setParsed({
          fileName: file.name,
          format,
          estimatedCount: format === "eml" ? 1 : null,
          file,
        });
        return;
      }

      throw new Error(
        "Unsupported file type. Use .csv, .json, .eml, or .mbox. Extensionless mbox/eml files are also supported if they contain standard mail headers.",
      );
    } catch (fileError) {
      setParsed(null);
      setError(fileError instanceof Error ? fileError.message : "Failed to read file.");
    } finally {
      setIsPreparing(false);
    }
  };

  const handleImport = () => {
    if (!parsed) {
      return;
    }

    setError(null);
    setResult(null);

    startTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/import", {
            method: "POST",
            headers: {
              ...(parsed.rows ? { "Content-Type": "application/json" } : {}),
            },
            body: parsed.rows
              ? JSON.stringify({
                  emails: parsed.rows.map((row) => mapRow(row)),
                })
              : (() => {
                  const formData = new FormData();
                  formData.append("file", parsed.file as File);
                  formData.append("format", parsed.format);
                  return formData;
                })(),
          });

          const data = (await response.json()) as {
            error?: string;
            imported: number;
            created: number;
            updated: number;
            removedSeedCount: number;
          };

          if (!response.ok) {
            throw new Error(data.error ?? "Import failed.");
          }

          setResult(data);
          router.refresh();
        } catch (requestError) {
          setError(
            requestError instanceof Error ? requestError.message : "Import failed.",
          );
        }
      })();
    });
  };

  return (
    <div className="space-y-5">
      <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center transition hover:border-stone-400 hover:bg-stone-100">
        <input
          type="file"
          className="hidden"
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={(event) => {
            const file = event.target.files?.[0];

            if (file) {
              void handleFile(file);
            }
          }}
        />
        <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-[0_12px_30px_-24px_rgba(28,25,23,0.45)]">
          {isPreparing ? (
            <LoaderCircle className="h-7 w-7 animate-spin" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </span>
        <span className="text-base font-semibold text-stone-950">
          {isPreparing ? "Reading file..." : "Choose a mail export file"}
        </span>
        <span className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
          Import stays local to this app. CSV, JSON, EML, MBOX, and extensionless mailbox files are validated by content after you select them.
        </span>
      </label>

      {isPreparing && parsed?.file ? (
        <div className="animate-enter rounded-2xl border border-stone-200 bg-white px-4 py-4 shadow-[0_16px_30px_-28px_rgba(28,25,23,0.45)]">
          <div className="flex items-center gap-3">
            <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
              <LoaderCircle className="h-5 w-5 animate-spin" />
            </span>
            <div>
              <p className="text-sm font-medium text-stone-950">{parsed.fileName}</p>
              <p className="text-sm text-stone-600">
                Checking file structure and preparing import.
              </p>
            </div>
          </div>
        </div>
      ) : null}

      {parsed ? (
        <div className="animate-enter space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_34px_-30px_rgba(28,25,23,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                <FormatIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-stone-900">{parsed.fileName}</p>
                <p className="text-sm text-stone-600">
                  {parsed.file ? formatBytes(parsed.file.size) : null}
                  {parsed.file ? " • " : null}
                  {parsed.estimatedCount === null
                    ? `Mailbox file selected as ${parsed.format.toUpperCase()}.`
                    : `${parsed.estimatedCount} email${parsed.estimatedCount === 1 ? "" : "s"} detected from ${parsed.format.toUpperCase()}.`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-stone-600">
                <Sparkles className="h-3.5 w-3.5" />
                Ready
              </span>
              <button
                type="button"
                onClick={handleImport}
                disabled={isPending || isPreparing}
                className="button-press inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
              >
                {isPending ? (
                  <>
                    <LoaderCircle className="h-4 w-4 animate-spin" />
                    Importing...
                  </>
                ) : (
                  <>
                    <UploadCloud className="h-4 w-4" />
                    Import emails
                  </>
                )}
              </button>
            </div>
          </div>

          {!hasStructuredRows ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-7 text-stone-700">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 inline-flex h-9 w-9 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-[0_10px_24px_-22px_rgba(28,25,23,0.55)]">
                  <Mail className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-medium text-stone-900">Mailbox file ready</p>
                  <p className="mt-1">
                    This path is ideal for WEB.DE exports saved as individual
                    <span className="font-medium text-stone-900"> .eml</span> files or mailbox archives from Thunderbird as
                    <span className="font-medium text-stone-900"> .mbox</span>.
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {hasStructuredRows ? (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Sender</th>
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {previewRows.map((row, index) => (
                    <tr key={`${row.senderEmail}-${row.subject}-${index}`}>
                      <td className="px-3 py-2 text-stone-700">{String(row.senderEmail ?? "")}</td>
                      <td className="px-3 py-2 text-stone-900">{String(row.subject ?? "")}</td>
                      <td className="px-3 py-2 text-stone-600">{String(row.receivedAt ?? "")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {isPending ? (
            <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm text-stone-700">
              <div className="flex items-center gap-3">
                <LoaderCircle className="h-4 w-4 animate-spin text-stone-700" />
                <p>Parsing messages and writing them into SQLite. Large mailbox files can take a bit.</p>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {result ? (
        <div className="animate-enter rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-900">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-emerald-700 shadow-[0_12px_28px_-24px_rgba(5,150,105,0.8)]">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Import complete</p>
              <p className="mt-1">
                Imported {result.imported} emails. Created {result.created}, updated {result.updated}.
              </p>
              {result.removedSeedCount > 0 ? (
                <p className="mt-1 text-emerald-800">
                  Removed {result.removedSeedCount} placeholder sample email
                  {result.removedSeedCount === 1 ? "" : "s"} before importing your mailbox.
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {error ? (
        <div className="animate-enter rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-white/80 text-rose-700 shadow-[0_12px_28px_-24px_rgba(190,24,93,0.8)]">
              <AlertCircle className="h-5 w-5" />
            </span>
            <div>
              <p className="font-medium">Import failed</p>
              <p className="mt-1">{error}</p>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

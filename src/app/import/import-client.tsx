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
import { useRouter } from "next/navigation";

type ImportPreview = {
  totalRows: number;
  validRows: number;
  invalidRows: number;
  duplicateRows: number;
  matchedExistingRows: number;
  projectedCreated: number;
  projectedUpdated: number;
  previewRows: Array<{
    messageId: string;
    senderEmail: string;
    subject: string;
    receivedAt: string;
    action: "create" | "update";
  }>;
  sampleErrors: Array<{
    index?: number;
    fileName?: string;
    messageIndex?: number;
    message: string;
  }>;
  fileCount: number;
  fileNames: string[];
  formatLabel: string;
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

function buildFormData(files: File[]) {
  const formData = new FormData();

  for (const file of files) {
    formData.append("files", file);
  }

  return formData;
}

export function ImportClient() {
  const router = useRouter();
  const [files, setFiles] = useState<File[]>([]);
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{
    batchId: string;
    imported: number;
    created: number;
    updated: number;
    removedSeedCount: number;
  } | null>(null);
  const [isPreviewPending, startPreviewTransition] = useTransition();
  const [isImportPending, startImportTransition] = useTransition();

  const totalFileSize = useMemo(
    () => files.reduce((sum, file) => sum + file.size, 0),
    [files],
  );
  const primaryFile = files[0];
  const FormatIcon =
    primaryFile?.name.toLowerCase().endsWith(".csv")
      ? FileSpreadsheet
      : primaryFile?.name.toLowerCase().endsWith(".json")
        ? FileJson2
        : primaryFile?.name.toLowerCase().endsWith(".mbox")
          ? FileArchive
          : Mail;
  const hasBlockingIssues = (preview?.invalidRows ?? 0) > 0 || (preview?.validRows ?? 0) === 0;

  function resetState() {
    setPreview(null);
    setResult(null);
    setError(null);
  }

  function handleFiles(nextFiles: FileList | null) {
    const normalizedFiles = nextFiles ? [...nextFiles].filter((file) => file.size > 0) : [];

    setFiles(normalizedFiles);
    resetState();

    if (normalizedFiles.length === 0) {
      return;
    }

    startPreviewTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/import/preview", {
            method: "POST",
            body: buildFormData(normalizedFiles),
          });
          const data = (await response.json()) as ImportPreview & { error?: string };

          if (!response.ok) {
            throw new Error(data.error ?? "Preview failed.");
          }

          setPreview(data);
        } catch (requestError) {
          setPreview(null);
          setError(
            requestError instanceof Error ? requestError.message : "Preview failed.",
          );
        }
      })();
    });
  }

  function handleImport() {
    if (files.length === 0 || !preview) {
      return;
    }

    setError(null);
    setResult(null);

    startImportTransition(() => {
      void (async () => {
        try {
          const response = await fetch("/api/import", {
            method: "POST",
            body: buildFormData(files),
          });
          const data = (await response.json()) as {
            error?: string;
            batchId: string;
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
  }

  return (
    <div className="space-y-5">
      <label className="flex min-h-44 cursor-pointer flex-col items-center justify-center rounded-2xl border border-dashed border-stone-300 bg-stone-50 px-6 py-8 text-center transition hover:border-stone-400 hover:bg-stone-100">
        <input
          type="file"
          className="hidden"
          multiple
          onClick={(event) => {
            event.currentTarget.value = "";
          }}
          onChange={(event) => handleFiles(event.target.files)}
        />
        <span className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-white text-stone-700 shadow-[0_12px_30px_-24px_rgba(28,25,23,0.45)]">
          {isPreviewPending ? (
            <LoaderCircle className="h-7 w-7 animate-spin" />
          ) : (
            <UploadCloud className="h-7 w-7" />
          )}
        </span>
        <span className="text-base font-semibold text-stone-950">
          {isPreviewPending ? "Preparing import preview..." : "Choose mail export file(s)"}
        </span>
        <span className="mt-2 max-w-xl text-sm leading-6 text-stone-600">
          Preview runs on the server before anything is written. Upload a single CSV, JSON, EML, or MBOX file, or select multiple `.eml` files as one batch.
        </span>
      </label>

      {files.length > 0 ? (
        <div className="animate-enter rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_34px_-30px_rgba(28,25,23,0.45)]">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-stone-100 text-stone-700">
                <FormatIcon className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-medium text-stone-900">
                  {files.length === 1 ? primaryFile?.name : `${files.length} files selected`}
                </p>
                <p className="text-sm text-stone-600">
                  {formatBytes(totalFileSize)} total • {files.length} file{files.length === 1 ? "" : "s"}
                </p>
              </div>
            </div>
            <span className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-medium uppercase tracking-[0.16em] text-stone-600">
              <Sparkles className="h-3.5 w-3.5" />
              {preview ? "Review ready" : isPreviewPending ? "Analyzing" : "Waiting"}
            </span>
          </div>
          {files.length > 1 ? (
            <div className="mt-4 flex flex-wrap gap-2">
              {files.slice(0, 8).map((file) => (
                <span
                  key={`${file.name}-${file.size}`}
                  className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700"
                >
                  {file.name}
                </span>
              ))}
              {files.length > 8 ? (
                <span className="rounded-full border border-stone-200 bg-stone-50 px-3 py-1.5 text-xs text-stone-700">
                  +{files.length - 8} more
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}

      {preview ? (
        <div className="animate-enter space-y-4 rounded-2xl border border-stone-200 bg-white p-4 shadow-[0_18px_34px_-30px_rgba(28,25,23,0.45)]">
          <div className="grid gap-3 md:grid-cols-3 xl:grid-cols-6">
            {[
              { label: "Rows detected", value: preview.totalRows },
              { label: "Valid rows", value: preview.validRows },
              { label: "Invalid rows", value: preview.invalidRows },
              { label: "Duplicates in upload", value: preview.duplicateRows },
              { label: "Will create", value: preview.projectedCreated },
              { label: "Will update", value: preview.projectedUpdated },
            ].map((item) => (
              <div
                key={item.label}
                className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3"
              >
                <p className="text-xs uppercase tracking-[0.14em] text-stone-500">{item.label}</p>
                <p className="mt-2 text-2xl font-semibold text-stone-950">{item.value}</p>
              </div>
            ))}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4">
            <div>
              <p className="text-sm font-medium text-stone-900">
                Review before importing
              </p>
              <p className="mt-1 text-sm text-stone-600">
                Format: {preview.formatLabel}. Existing matches: {preview.matchedExistingRows}. Files: {preview.fileCount}.
              </p>
            </div>
            <button
              type="button"
              onClick={handleImport}
              disabled={isImportPending || hasBlockingIssues}
              className="button-press inline-flex items-center gap-2 rounded-full bg-stone-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-stone-800 disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isImportPending ? (
                <>
                  <LoaderCircle className="h-4 w-4 animate-spin" />
                  Importing...
                </>
              ) : (
                <>
                  <UploadCloud className="h-4 w-4" />
                  Confirm import
                </>
              )}
            </button>
          </div>

          {preview.previewRows.length > 0 ? (
            <div className="overflow-x-auto rounded-2xl border border-stone-200">
              <table className="min-w-full divide-y divide-stone-200 text-left text-sm">
                <thead className="bg-stone-50 text-stone-600">
                  <tr>
                    <th className="px-3 py-2 font-medium">Action</th>
                    <th className="px-3 py-2 font-medium">Sender</th>
                    <th className="px-3 py-2 font-medium">Subject</th>
                    <th className="px-3 py-2 font-medium">Received</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {preview.previewRows.map((row) => (
                    <tr key={row.messageId}>
                      <td className="px-3 py-2">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] ${
                            row.action === "update"
                              ? "bg-amber-100 text-amber-900"
                              : "bg-emerald-100 text-emerald-900"
                          }`}
                        >
                          {row.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-stone-700">{row.senderEmail}</td>
                      <td className="px-3 py-2 text-stone-900">{row.subject || "Untitled email"}</td>
                      <td className="px-3 py-2 text-stone-600">
                        {new Intl.DateTimeFormat("en-GB", {
                          dateStyle: "medium",
                          timeStyle: "short",
                        }).format(new Date(row.receivedAt))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}

          {preview.sampleErrors.length > 0 ? (
            <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-4 text-sm text-rose-900">
              <p className="font-medium">Rows that need attention</p>
              <div className="mt-3 space-y-2">
                {preview.sampleErrors.map((issue, index) => (
                  <p key={`${issue.message}-${index}`}>
                    {issue.fileName ? `${issue.fileName}: ` : ""}
                    {issue.index ? `row ${issue.index}: ` : ""}
                    {issue.messageIndex ? `message ${issue.messageIndex}: ` : ""}
                    {issue.message}
                  </p>
                ))}
              </div>
            </div>
          ) : null}

          {preview.duplicateRows > 0 ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-900">
              Duplicate rows were detected inside this upload. The first occurrence of each message will be imported and later duplicates will be ignored.
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
                Batch {result.batchId}. Imported {result.imported} emails. Created {result.created}, updated {result.updated}.
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

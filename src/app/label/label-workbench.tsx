"use client";

import { AlertTriangle, CheckCircle2, LoaderCircle, ShieldAlert, Sparkles, Trash2 } from "lucide-react";
import { useEffect, useEffectEvent, useMemo, useState, useTransition } from "react";
import Link from "next/link";

import { EmailCard } from "@/components/email-card";
import { LabelingGuidelines } from "@/components/labeling-guidelines";
import { Panel } from "@/components/panel";
import { ProgressBar } from "@/components/progress-bar";
import {
  CATEGORY_META,
  CATEGORY_VALUES,
  LABEL_META,
  LABEL_VALUES,
  type EmailCategory,
  type EmailLabel,
} from "@/lib/constants";
import type { ProgressSummary } from "@/lib/emails";
import {
  buildLabelSessionSnapshot,
  LABEL_SESSION_MAX_AGE_MS,
  LABEL_SESSION_STORAGE_KEY,
  parseLabelSessionSnapshot,
  type LabelDraftMap,
} from "@/lib/label-session";
import type { EmailRecord } from "@/lib/serializers";

type LabelWorkbenchProps = {
  initialEmail: EmailRecord | null;
  initialProgress: ProgressSummary;
};

function buildInitialSessionState(initialEmail: EmailRecord | null) {
  const fallbackDrafts: LabelDraftMap = initialEmail
    ? {
        [initialEmail.id]: {
          category: initialEmail.category ?? "",
          notes: initialEmail.notes ?? "",
        },
      }
    : {};

  const fallbackState = {
    trail: initialEmail ? [initialEmail] : [],
    index: initialEmail ? 0 : -1,
    drafts: fallbackDrafts,
    seenIds: initialEmail ? [initialEmail.id] : [],
    didRestoreSession: false,
  };

  if (typeof window === "undefined") {
    return fallbackState;
  }

  const snapshot = parseLabelSessionSnapshot(
    window.localStorage.getItem(LABEL_SESSION_STORAGE_KEY),
  );

  if (!snapshot) {
    return fallbackState;
  }

  if (Date.now() - Date.parse(snapshot.savedAt) > LABEL_SESSION_MAX_AGE_MS) {
    window.localStorage.removeItem(LABEL_SESSION_STORAGE_KEY);
    return fallbackState;
  }

  if (snapshot.trail.length === 0 || snapshot.index < 0) {
    return fallbackState;
  }

  return {
    trail: snapshot.trail,
    index: snapshot.index,
    drafts: snapshot.drafts as LabelDraftMap,
    seenIds: snapshot.seenIds,
    didRestoreSession: true,
  };
}

function updateProgressCounts(
  previous: ProgressSummary,
  email: EmailRecord,
  nextLabel: EmailLabel,
) {
  const previousLabel = email.label as EmailLabel | null;
  const wasLabeled = email.isLabeled;

  let labeled = previous.labeled;
  let unlabeled = previous.unlabeled;
  let skipped = previous.skipped;

  if (!wasLabeled) {
    labeled += 1;
    unlabeled = Math.max(0, unlabeled - 1);
  }

  if (previousLabel === "skip") {
    skipped = Math.max(0, skipped - 1);
  }

  if (nextLabel === "skip") {
    skipped += 1;
  }

  return {
    ...previous,
    labeled,
    unlabeled,
    skipped,
    progressPercentage: previous.total === 0 ? 0 : Math.round((labeled / previous.total) * 100),
  };
}

async function readJson<T>(input: RequestInfo | URL, init?: RequestInit) {
  const response = await fetch(input, init);
  const data = (await response.json()) as T & { error?: string };

  if (!response.ok) {
    throw new Error(data.error ?? "Unexpected server response.");
  }

  return data;
}

export function LabelWorkbench({
  initialEmail,
  initialProgress,
}: LabelWorkbenchProps) {
  const [initialSessionState] = useState(() => buildInitialSessionState(initialEmail));
  const [trail, setTrail] = useState<EmailRecord[]>(initialSessionState.trail);
  const [index, setIndex] = useState(initialSessionState.index);
  const [progress, setProgress] = useState(initialProgress);
  const [drafts, setDrafts] = useState<LabelDraftMap>(initialSessionState.drafts);
  const [seenIds, setSeenIds] = useState<number[]>(initialSessionState.seenIds);
  const [error, setError] = useState<string | null>(null);
  const [pendingLabel, setPendingLabel] = useState<EmailLabel | null>(null);
  const [didRestoreSession] = useState(initialSessionState.didRestoreSession);
  const [isPending, startTransition] = useTransition();

  const currentEmail = useMemo(
    () => (index >= 0 ? trail[index] ?? null : null),
    [index, trail],
  );

  const currentDraft = currentEmail
    ? drafts[currentEmail.id] ?? {
        category: currentEmail.category ?? "",
        notes: currentEmail.notes ?? "",
      }
    : { category: "", notes: "" };

  const persistSession = useEffectEvent(() => {
    if (typeof window === "undefined") {
      return;
    }

    try {
      const snapshot = buildLabelSessionSnapshot({
        trail,
        index,
        drafts,
        seenIds,
      });

      window.localStorage.setItem(
        LABEL_SESSION_STORAGE_KEY,
        JSON.stringify(snapshot),
      );
    } catch {
      // Ignore storage write failures so labeling can continue.
    }
  });

  function discardRecoveredSession() {
    if (typeof window === "undefined") {
      return;
    }

    window.localStorage.removeItem(LABEL_SESSION_STORAGE_KEY);
    window.location.reload();
  }

  async function fetchNextEmail() {
    const excludeIds = seenIds;
    const params = new URLSearchParams();

    if (excludeIds.length > 0) {
      params.set("exclude", excludeIds.join(","));
    }

    const result = await readJson<{ email: EmailRecord | null }>(
      `/api/emails/next?${params.toString()}`,
    );

    if (!result.email) {
      return null;
    }

    setSeenIds((previous) =>
      previous.includes(result.email!.id)
        ? previous
        : [...previous, result.email!.id],
    );
    setTrail((previous) => {
      const nextTrail = previous.slice(0, index + 1);
      nextTrail.push(result.email as EmailRecord);
      return nextTrail;
    });
    setIndex((previous) => previous + 1);
    return result.email;
  }

  async function handleNext() {
    setError(null);

    if (index < trail.length - 1) {
      setIndex((previous) => previous + 1);
      return;
    }

    const nextEmail = await fetchNextEmail();

    if (!nextEmail) {
      setError("No more unlabeled emails in the queue.");
    }
  }

  function handlePrevious() {
    setError(null);

    if (index > 0) {
      setIndex((previous) => previous - 1);
    }
  }

  function handleLabel(label: EmailLabel) {
    if (!currentEmail) {
      return;
    }

    setError(null);
    setPendingLabel(label);

    startTransition(() => {
      void (async () => {
        try {
          await readJson<{ email: EmailRecord }>(`/api/emails/${currentEmail.id}/label`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              label,
              category: currentDraft.category || null,
              notes: currentDraft.notes || null,
            }),
          });

          setProgress((previous) => updateProgressCounts(previous, currentEmail, label));
          setTrail((previous) =>
            previous.map((email, trailIndex) =>
              trailIndex === index
                ? {
                    ...email,
                    label,
                    category: (currentDraft.category || null) as EmailCategory | null,
                    notes: currentDraft.notes || null,
                    isLabeled: true,
                    labeledAt: new Date().toISOString(),
                  }
                : email,
            ),
          );

          if (index < trail.length - 1) {
            setIndex((previous) => previous + 1);
            return;
          }

          const nextEmail = await fetchNextEmail();

          if (!nextEmail) {
            setError("Queue complete. Everything currently visible has been labeled.");
          }
        } catch (requestError) {
          setError(
            requestError instanceof Error
              ? requestError.message
              : "Failed to save the label.",
          );
        } finally {
          setPendingLabel(null);
        }
      })();
    });
  }

  const labelIcons = {
    important: ShieldAlert,
    useful: Sparkles,
    irrelevant: Trash2,
    skip: AlertTriangle,
  } as const;

  function setCurrentCategory(nextCategory: string) {
    if (!currentEmail) {
      return;
    }

    setDrafts((previous) => ({
      ...previous,
      [currentEmail.id]: {
        ...currentDraft,
        category: nextCategory,
      },
    }));
  }

  const handleKeyboard = useEffectEvent((event: KeyboardEvent) => {
    const target = event.target as HTMLElement | null;
    const tagName = target?.tagName ?? "";

    if (tagName === "INPUT" || tagName === "TEXTAREA" || target?.isContentEditable) {
      return;
    }

    if (event.key === "1") {
      event.preventDefault();
      void handleLabel("important");
    }

    if (event.key === "2") {
      event.preventDefault();
      void handleLabel("useful");
    }

    if (event.key === "3") {
      event.preventDefault();
      void handleLabel("irrelevant");
    }

    if (event.key.toLowerCase() === "s") {
      event.preventDefault();
      void handleLabel("skip");
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      void handleNext();
    }

    if (event.key === "ArrowLeft") {
      event.preventDefault();
      handlePrevious();
    }
  });

  useEffect(() => {
    window.addEventListener("keydown", handleKeyboard);

    return () => {
      window.removeEventListener("keydown", handleKeyboard);
    };
  }, []);

  useEffect(() => {
    persistSession();
  }, [drafts, index, seenIds, trail]);

  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === "hidden") {
        persistSession();
      }
    };
    const handlePageHide = () => {
      persistSession();
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);
    window.addEventListener("pagehide", handlePageHide);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
      window.removeEventListener("pagehide", handlePageHide);
    };
  }, []);

  useEffect(() => {
    if (!isPending) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };

    window.addEventListener("beforeunload", handleBeforeUnload);

    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [isPending]);

  return (
    <div className="animate-enter space-y-6">
      <Panel>
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium uppercase tracking-[0.18em] text-stone-500">
              Label queue
            </p>
            <h1 className="text-3xl font-semibold text-stone-950">Fast, consistent email labeling</h1>
            <p className="max-w-2xl text-sm leading-6 text-stone-600">
              Use the number keys for labels, <span className="font-medium text-stone-900">S</span> for skip, and the arrow keys to move through the queue.
            </p>
          </div>
          <div className="min-w-[280px] space-y-2">
            <div className="flex items-center justify-between text-sm text-stone-700">
              <span>{progress.labeled} / {progress.total} labeled</span>
              <span className="flex items-center gap-2">
                {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : null}
                {isPending ? "Saving..." : `${progress.unlabeled} remaining`}
              </span>
            </div>
            <ProgressBar value={progress.labeled} total={progress.total} />
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-stone-500">
              <p>
                {didRestoreSession
                  ? "Restored your last session. Progress autosaves locally across refreshes and tab switches."
                  : "Progress autosaves locally across refreshes and tab switches."}
              </p>
              {didRestoreSession ? (
                <button
                  type="button"
                  onClick={discardRecoveredSession}
                  className="font-medium text-stone-700 underline decoration-stone-300 underline-offset-4 transition hover:text-stone-900"
                >
                  Start fresh
                </button>
              ) : null}
            </div>
          </div>
        </div>
      </Panel>

      {!currentEmail ? (
        <Panel title="No email loaded" description="Seed the database or open a labeled email from the list view.">
          <div className="space-y-3 text-sm text-stone-600">
            <p>No email is currently available in the labeling queue.</p>
            <div className="flex flex-wrap gap-3">
              <Link
                href="/emails"
                className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 font-medium text-stone-800 transition hover:border-stone-300 hover:bg-stone-100"
              >
                Open email list
              </Link>
              <Link
                href="/stats"
                className="rounded-full border border-stone-200 bg-stone-50 px-4 py-2 font-medium text-stone-800 transition hover:border-stone-300 hover:bg-stone-100"
              >
                View stats
              </Link>
            </div>
          </div>
        </Panel>
      ) : (
        <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <EmailCard email={currentEmail} />

          <div className="space-y-6">
            <Panel title="Assign label" description="Primary label is required. Category and notes are optional.">
              <div className="space-y-4">
                <div className="grid gap-3">
                  {LABEL_VALUES.map((label) => (
                    (() => {
                      const Icon = labelIcons[label];
                      const isSelected = currentEmail.label === label;
                      const isWorking = pendingLabel === label;

                      return (
                        <button
                          key={label}
                          type="button"
                          onClick={() => handleLabel(label)}
                          disabled={isPending}
                          className={`button-press relative flex items-center justify-between rounded-2xl border px-4 py-3 text-left ${
                            isSelected
                              ? `${LABEL_META[label].selectedClass} ${LABEL_META[label].activeTextClass}`
                              : LABEL_META[label].idleClass
                          } disabled:cursor-not-allowed disabled:opacity-70`}
                        >
                          <span className="flex items-start gap-3">
                            <span
                              className={`mt-0.5 inline-flex h-11 w-11 shrink-0 items-center justify-center self-start rounded-full border bg-white/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] ${
                                isSelected ? "border-current/35" : "border-current/25"
                              }`}
                            >
                              {isWorking ? (
                                <LoaderCircle className="h-4.5 w-4.5 animate-spin" />
                              ) : isSelected ? (
                                <CheckCircle2 className="h-4.5 w-4.5" />
                              ) : (
                                <Icon className="h-4.5 w-4.5" />
                              )}
                            </span>
                            <span>
                              <span className="block text-base font-semibold">
                                [{LABEL_META[label].shortcut}] {LABEL_META[label].title}
                              </span>
                              <span className="mt-1 block text-sm opacity-85">
                                {isWorking
                                  ? "Saving your choice..."
                                  : LABEL_META[label].description}
                              </span>
                            </span>
                          </span>

                          <span className="pl-3 text-xs font-semibold uppercase tracking-[0.18em] opacity-70">
                            {isWorking ? "Now" : isSelected ? "Chosen" : "Select"}
                          </span>
                        </button>
                      );
                    })()
                  ))}
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-800">
                    Optional category
                  </label>
                  <div className="category-bar rounded-2xl border border-stone-200 bg-stone-50 p-2">
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => setCurrentCategory("")}
                        className={`category-chip ${
                          currentDraft.category === ""
                            ? "category-chip-active"
                            : "category-chip-idle"
                        }`}
                      >
                        None
                      </button>
                      {CATEGORY_VALUES.map((value) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => setCurrentCategory(value)}
                          className={`category-chip ${
                            currentDraft.category === value
                              ? "category-chip-active"
                              : "category-chip-idle"
                          }`}
                        >
                          {CATEGORY_META[value].title}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium text-stone-800" htmlFor="label-notes">
                    Notes
                  </label>
                  <textarea
                    id="label-notes"
                    rows={4}
                    maxLength={500}
                    value={currentDraft.notes}
                    onChange={(event) =>
                      currentEmail
                        ? setDrafts((previous) => ({
                            ...previous,
                            [currentEmail.id]: {
                              ...currentDraft,
                              notes: event.target.value,
                            },
                          }))
                        : undefined
                    }
                    placeholder="Optional context for edge cases or ambiguity."
                    className="w-full rounded-2xl border border-stone-200 bg-stone-50 px-3 py-3 text-sm leading-6 text-stone-900 outline-none transition focus:border-stone-400"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => handlePrevious()}
                    disabled={index <= 0 || isPending}
                    className="button-press rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:border-stone-300 hover:bg-stone-50 hover:shadow-[0_12px_24px_-20px_rgba(28,25,23,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    [←] Previous
                  </button>
                  <button
                    type="button"
                    onClick={() => handleNext()}
                    disabled={isPending}
                    className="button-press rounded-full border border-stone-200 bg-white px-4 py-2.5 text-sm font-medium text-stone-800 hover:border-stone-300 hover:bg-stone-50 hover:shadow-[0_12px_24px_-20px_rgba(28,25,23,0.45)] disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    [→] Next
                  </button>
                </div>

                {isPending ? (
                  <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-3 text-sm text-stone-700">
                    <div className="flex items-center gap-3">
                      <LoaderCircle className="h-4 w-4 animate-spin" />
                      <p>Saving label and moving the queue forward.</p>
                    </div>
                  </div>
                ) : null}

                {error ? <p className="text-sm text-rose-700">{error}</p> : null}
              </div>
            </Panel>

            <LabelingGuidelines />
          </div>
        </div>
      )}
    </div>
  );
}

export const LABEL_VALUES = [
  "important",
  "useful",
  "irrelevant",
  "skip",
] as const;

export type EmailLabel = (typeof LABEL_VALUES)[number];

export const CATEGORY_VALUES = [
  "exam",
  "deadline",
  "course",
  "admin",
  "career",
  "event",
  "newsletter",
  "system",
  "other",
] as const;

export type EmailCategory = (typeof CATEGORY_VALUES)[number];

export const ML_EXPORT_LABELS: readonly EmailLabel[] = [
  "important",
  "useful",
  "irrelevant",
];

export const LABEL_META: Record<
  EmailLabel,
  {
    title: string;
    description: string;
    accent: string;
    shortcut: string;
    selectedClass: string;
    idleClass: string;
    activeTextClass: string;
  }
> = {
  important: {
    title: "Important",
    description: "Requires action, attention, or a decision soon.",
    accent: "bg-rose-100 text-rose-700 border-rose-200",
    shortcut: "1",
    selectedClass:
      "border-rose-500 bg-rose-500/10 shadow-[0_18px_40px_-24px_rgba(244,63,94,0.55)]",
    idleClass:
      "border-rose-200/80 bg-rose-50/75 text-rose-950 hover:border-rose-300 hover:bg-rose-100/80 hover:shadow-[0_16px_32px_-24px_rgba(244,63,94,0.3)]",
    activeTextClass: "text-rose-700",
  },
  useful: {
    title: "Useful",
    description: "Helpful information without an immediate action.",
    accent: "bg-emerald-100 text-emerald-700 border-emerald-200",
    shortcut: "2",
    selectedClass:
      "border-emerald-500 bg-emerald-500/10 shadow-[0_18px_40px_-24px_rgba(16,185,129,0.55)]",
    idleClass:
      "border-emerald-200/80 bg-emerald-50/75 text-emerald-950 hover:border-emerald-300 hover:bg-emerald-100/80 hover:shadow-[0_16px_32px_-24px_rgba(16,185,129,0.3)]",
    activeTextClass: "text-emerald-700",
  },
  irrelevant: {
    title: "Irrelevant",
    description: "Not useful for study-related email classification.",
    accent: "bg-slate-200 text-slate-700 border-slate-300",
    shortcut: "3",
    selectedClass:
      "border-slate-500 bg-slate-500/10 shadow-[0_18px_40px_-24px_rgba(100,116,139,0.5)]",
    idleClass:
      "border-slate-200/90 bg-slate-50/80 text-slate-950 hover:border-slate-300 hover:bg-slate-100/90 hover:shadow-[0_16px_32px_-24px_rgba(100,116,139,0.25)]",
    activeTextClass: "text-slate-700",
  },
  skip: {
    title: "Skip",
    description: "Unclear, broken, duplicate, or not suitable for training.",
    accent: "bg-amber-100 text-amber-700 border-amber-200",
    shortcut: "S",
    selectedClass:
      "border-amber-500 bg-amber-500/10 shadow-[0_18px_40px_-24px_rgba(245,158,11,0.5)]",
    idleClass:
      "border-amber-200/90 bg-amber-50/80 text-amber-950 hover:border-amber-300 hover:bg-amber-100/90 hover:shadow-[0_16px_32px_-24px_rgba(245,158,11,0.28)]",
    activeTextClass: "text-amber-700",
  },
};

export const CATEGORY_META: Record<EmailCategory, { title: string }> = {
  exam: { title: "Exam" },
  deadline: { title: "Deadline" },
  course: { title: "Course" },
  admin: { title: "Admin" },
  career: { title: "Career" },
  event: { title: "Event" },
  newsletter: { title: "Newsletter" },
  system: { title: "System" },
  other: { title: "Other" },
};

export const NAV_ITEMS = [
  { href: "/label", label: "Label", icon: "tag" },
  { href: "/import", label: "Import", icon: "upload" },
  { href: "/emails", label: "Emails", icon: "inbox" },
  { href: "/stats", label: "Stats", icon: "chart" },
  { href: "/export", label: "Export", icon: "download" },
] as const;

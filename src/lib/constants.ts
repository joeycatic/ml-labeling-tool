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
    accent: "bg-rose-100 text-rose-800 border-rose-300",
    shortcut: "1",
    selectedClass:
      "border-rose-600 bg-rose-100 shadow-[0_18px_40px_-24px_rgba(244,63,94,0.45)]",
    idleClass:
      "border-rose-300 bg-rose-50 text-rose-950 hover:border-rose-400 hover:bg-rose-100 hover:shadow-[0_16px_32px_-24px_rgba(244,63,94,0.28)]",
    activeTextClass: "text-rose-800",
  },
  useful: {
    title: "Useful",
    description: "Helpful information without an immediate action.",
    accent: "bg-emerald-100 text-emerald-800 border-emerald-300",
    shortcut: "2",
    selectedClass:
      "border-emerald-600 bg-emerald-100 shadow-[0_18px_40px_-24px_rgba(16,185,129,0.42)]",
    idleClass:
      "border-emerald-300 bg-emerald-50 text-emerald-950 hover:border-emerald-400 hover:bg-emerald-100 hover:shadow-[0_16px_32px_-24px_rgba(16,185,129,0.26)]",
    activeTextClass: "text-emerald-800",
  },
  irrelevant: {
    title: "Irrelevant",
    description: "Not useful for study-related email classification.",
    accent: "bg-slate-200 text-slate-800 border-slate-400",
    shortcut: "3",
    selectedClass:
      "border-slate-600 bg-slate-200 shadow-[0_18px_40px_-24px_rgba(100,116,139,0.4)]",
    idleClass:
      "border-slate-300 bg-slate-50 text-slate-950 hover:border-slate-400 hover:bg-slate-100 hover:shadow-[0_16px_32px_-24px_rgba(100,116,139,0.24)]",
    activeTextClass: "text-slate-800",
  },
  skip: {
    title: "Skip",
    description: "Unclear, broken, duplicate, or not suitable for training.",
    accent: "bg-amber-100 text-amber-800 border-amber-300",
    shortcut: "S",
    selectedClass:
      "border-amber-600 bg-amber-100 shadow-[0_18px_40px_-24px_rgba(245,158,11,0.42)]",
    idleClass:
      "border-amber-300 bg-amber-50 text-amber-950 hover:border-amber-400 hover:bg-amber-100 hover:shadow-[0_16px_32px_-24px_rgba(245,158,11,0.26)]",
    activeTextClass: "text-amber-800",
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
  { href: "/emails", label: "Emails", icon: "inbox" },
  { href: "/stats", label: "Stats", icon: "chart" },
  { href: "/import", label: "Import", icon: "upload" },
  { href: "/export", label: "Export", icon: "download" },
] as const;

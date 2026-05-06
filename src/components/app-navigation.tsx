"use client";

import type { LucideIcon } from "lucide-react";
import {
  ChartColumn,
  Download,
  Inbox,
  Tags,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAV_ITEMS } from "@/lib/constants";
import { ThemeToggle } from "@/components/theme-toggle";

const iconMap: Record<(typeof NAV_ITEMS)[number]["icon"], LucideIcon> = {
  tag: Tags,
  upload: Upload,
  inbox: Inbox,
  chart: ChartColumn,
  download: Download,
};

export function AppNavigation() {
  const pathname = usePathname();

  return (
    <header className="app-header sticky top-0 z-40 border-b border-stone-200/80 bg-white/90">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:gap-4 lg:px-8">
        <Link
          href="/label"
          className="group inline-flex shrink-0 items-center gap-3 rounded-2xl"
        >
          <span className="brand-mark inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-stone-200 bg-white text-stone-900 shadow-[0_14px_32px_-28px_rgba(28,25,23,0.35)] transition duration-200 group-hover:-translate-y-0.5">
            <Tags className="h-4 w-4" />
          </span>
          <span className="min-w-0 leading-none">
            <span className="block text-[10px] font-semibold uppercase tracking-[0.18em] text-stone-500">
              Local-first
            </span>
            <span className="mt-1 block truncate text-lg font-semibold tracking-tight text-stone-950">
              Email Labeling Dashboard
            </span>
          </span>
        </Link>

        <div className="nav-frame flex-1 rounded-[24px] border border-stone-200 bg-white/88 p-1 shadow-[0_18px_46px_-38px_rgba(28,25,23,0.28)]">
          <nav className="nav-rail nav-scroll flex items-center gap-1 overflow-x-auto px-0.5 lg:justify-center">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/label" && pathname.startsWith(item.href));
              const Icon = iconMap[item.icon];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-pill nav-link group inline-flex shrink-0 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-medium whitespace-nowrap ${
                    active
                      ? "nav-pill-active nav-link-active border-stone-900 bg-stone-900 text-white"
                      : "border-transparent bg-transparent text-stone-700 hover:border-stone-200 hover:bg-stone-50/90 hover:text-stone-950"
                  }`}
                >
                  <span
                    className={`nav-link-icon inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border ${
                      active
                        ? "border-white/10 bg-white/12 text-white"
                        : "border-stone-200 bg-white text-stone-600 group-hover:border-stone-900 group-hover:bg-stone-900 group-hover:text-white"
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="min-w-0 text-left font-medium">{item.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex shrink-0 justify-end">
          <div className="theme-slot rounded-2xl p-0">
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

"use client";

import type { LucideIcon } from "lucide-react";
import { ChartColumn, Download, Inbox, Tags, Upload } from "lucide-react";
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
    <header className="app-header border-b border-stone-200 bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:px-8">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div className="space-y-1">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-stone-500">
              Local-first workflow
            </p>
            <div>
              <Link href="/label" className="text-2xl font-semibold text-stone-950">
                Email Labeling Dashboard
              </Link>
              <p className="text-sm text-stone-600">
                SQLite, Prisma, keyboard shortcuts, and export-ready training data.
              </p>
            </div>
          </div>
        </div>
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <nav className="nav-rail flex flex-wrap items-center gap-2 rounded-2xl border border-stone-200 bg-stone-50/90 p-1.5">
            {NAV_ITEMS.map((item) => {
              const active =
                pathname === item.href ||
                (item.href !== "/label" && pathname.startsWith(item.href));
              const Icon = iconMap[item.icon];

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`nav-pill nav-link rounded-xl border px-4 py-2.5 text-sm font-medium ${
                    active
                      ? "nav-pill-active nav-link-active border-stone-900 bg-stone-900 text-white"
                      : "border-transparent bg-transparent text-stone-700 hover:border-stone-200 hover:bg-white"
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </span>
                </Link>
              );
            })}
          </nav>
          <div className="theme-slot flex items-center justify-between gap-3 rounded-2xl border border-stone-200 bg-stone-50/90 px-3 py-2.5 lg:min-w-[168px]">
            <div className="hidden sm:block">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-stone-500">
                Theme
              </p>
              <p className="text-xs text-stone-600">Interface appearance</p>
            </div>
            <ThemeToggle />
          </div>
        </div>
      </div>
    </header>
  );
}

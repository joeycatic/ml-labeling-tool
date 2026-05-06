import type { ReactNode } from "react";

type PanelProps = {
  title?: string;
  description?: string;
  children: ReactNode;
  className?: string;
};

export function Panel({ title, description, children, className = "" }: PanelProps) {
  return (
    <section
      className={`panel-surface animate-enter rounded-2xl border border-stone-200 bg-white p-5 shadow-[0_20px_60px_-40px_rgba(28,25,23,0.35)] ${className}`}
    >
      {(title || description) && (
        <header className="mb-4 space-y-1">
          {title ? <h2 className="text-lg font-semibold text-stone-950">{title}</h2> : null}
          {description ? <p className="text-sm text-stone-600">{description}</p> : null}
        </header>
      )}
      {children}
    </section>
  );
}

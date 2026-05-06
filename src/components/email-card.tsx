import type { EmailRecord } from "@/lib/serializers";
import { formatDateTime, toDisplayText } from "@/lib/utils";

import { CategoryBadge, LabelBadge } from "./badge";
import { Panel } from "./panel";

export function EmailCard({
  email,
  compact = false,
}: {
  email: EmailRecord;
  compact?: boolean;
}) {
  return (
    <Panel className={compact ? "" : "h-full"}>
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-stone-100 pb-4">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <LabelBadge label={email.label} />
            <CategoryBadge category={email.category} />
          </div>
          <h2 className="text-2xl font-semibold text-stone-950">
            {email.subject.trim() || "Untitled email"}
          </h2>
          <div className="space-y-1 text-sm text-stone-600">
            <p>
              <span className="font-medium text-stone-900">
                {toDisplayText(email.senderName)}
              </span>{" "}
              &lt;{email.senderEmail}&gt;
            </p>
            <p>{formatDateTime(email.receivedAt)}</p>
          </div>
        </div>
        <dl className="grid min-w-[220px] grid-cols-1 gap-2 text-sm text-stone-600">
          <div>
            <dt className="font-medium text-stone-900">Message ID</dt>
            <dd className="break-all">{email.messageId}</dd>
          </div>
          <div>
            <dt className="font-medium text-stone-900">Recipient</dt>
            <dd>{toDisplayText(email.recipientEmail)}</dd>
          </div>
        </dl>
      </div>

      <div className={`mt-4 space-y-5 ${compact ? "" : "max-h-[32rem] overflow-y-auto pr-1"}`}>
        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
            Snippet
          </h3>
          <p className="rounded-2xl bg-stone-50 px-4 py-3 text-sm leading-7 text-stone-700">
            {email.snippet.trim() || "No snippet available."}
          </p>
        </section>

        <section className="space-y-2">
          <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
            Body
          </h3>
          <div className="rounded-2xl border border-stone-200 bg-stone-50 px-4 py-4 text-sm leading-7 whitespace-pre-wrap text-stone-800">
            {email.bodyText?.trim() || "No plain-text body available."}
          </div>
        </section>

        {email.notes ? (
          <section className="space-y-2">
            <h3 className="text-sm font-semibold uppercase tracking-[0.14em] text-stone-500">
              Notes
            </h3>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm leading-7 text-amber-900">
              {email.notes}
            </div>
          </section>
        ) : null}
      </div>
    </Panel>
  );
}

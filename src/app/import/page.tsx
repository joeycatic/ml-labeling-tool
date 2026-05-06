import { Panel } from "@/components/panel";

import { ImportClient } from "./import-client";

export default function ImportPage() {
  return (
    <div className="space-y-6">
      <Panel
        title="Import Emails"
        description="Upload a local CSV, JSON, EML, or MBOX file and store the rows in SQLite for labeling."
      >
        <ImportClient />
      </Panel>

      <div className="grid gap-6 lg:grid-cols-3">
        <Panel title="WEB.DE path" description="This is the easiest free route from a WEB.DE mailbox into the dashboard.">
          <div className="space-y-3 text-sm leading-7 text-stone-700">
            <p>1. In WEB.DE, enable `POP3/IMAP Abruf` in the mailbox settings.</p>
            <p>2. Sync the account into Thunderbird with `imap.web.de`.</p>
            <p>3. Export messages as `.eml` or a folder as `.mbox`.</p>
            <p>4. Upload that file here.</p>
          </div>
        </Panel>

        <Panel title="Accepted fields" description="Only senderEmail and receivedAt are strictly required. messageId is strongly recommended.">
          <div className="space-y-2 text-sm leading-7 text-stone-700">
            <p>`messageId`</p>
            <p>`threadId`</p>
            <p>`senderName`</p>
            <p>`senderEmail`</p>
            <p>`recipientEmail`</p>
            <p>`subject`</p>
            <p>`snippet`</p>
            <p>`bodyText`</p>
            <p>`bodyHtml`</p>
            <p>`receivedAt`</p>
            <p>`label`</p>
            <p>`category`</p>
            <p>`notes`</p>
            <p>`source`</p>
          </div>
        </Panel>

        <Panel title="CSV example" description="Headers can use camelCase or snake_case for the common fields.">
          <pre className="overflow-x-auto rounded-2xl border border-stone-200 bg-stone-50 p-4 text-xs leading-6 text-stone-700">
{`messageId,senderEmail,subject,snippet,bodyText,receivedAt
gmail-001,professor@uni.edu,Assignment deadline,Submit by Friday,Please upload your report by Friday at 17:00,2026-05-01T09:30:00Z
gmail-002,newsletter@uni.edu,Campus update,Weekly digest,This week's campus events and announcements,2026-05-02T07:15:00Z`}
          </pre>
        </Panel>
      </div>
    </div>
  );
}

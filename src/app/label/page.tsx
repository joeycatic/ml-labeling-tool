import { getNextUnlabeledEmail, getProgressSummary } from "@/lib/emails";
import { serializeEmail } from "@/lib/serializers";

import { LabelWorkbench } from "./label-workbench";

export const dynamic = "force-dynamic";

export default async function LabelPage() {
  const [progress, email] = await Promise.all([
    getProgressSummary(),
    getNextUnlabeledEmail(),
  ]);

  return (
    <LabelWorkbench
      initialEmail={serializeEmail(email)}
      initialProgress={progress}
    />
  );
}

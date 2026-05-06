import { LABEL_META } from "@/lib/constants";

import { Panel } from "./panel";

export function LabelingGuidelines() {
  return (
    <Panel title="Labeling Guidelines" description="Keep labels consistent so the training set stays useful.">
      <div className="space-y-4 text-sm leading-7 text-stone-700">
        <div>
          <p className="font-semibold text-stone-950">{LABEL_META.important.title}</p>
          <p>I probably need to act on this email. Think deadlines, exams, assignments, admin issues, or direct professor communication.</p>
        </div>
        <div>
          <p className="font-semibold text-stone-950">{LABEL_META.useful.title}</p>
          <p>Helpful but not urgent. Events, workshops, career opportunities, or optional information worth keeping.</p>
        </div>
        <div>
          <p className="font-semibold text-stone-950">{LABEL_META.irrelevant.title}</p>
          <p>Can be ignored. Generic newsletters, ads, or items unrelated to your studies.</p>
        </div>
        <div>
          <p className="font-semibold text-stone-950">{LABEL_META.skip.title}</p>
          <p>Use when the email is unclear, broken, duplicate, or not suitable for training.</p>
        </div>
      </div>
    </Panel>
  );
}

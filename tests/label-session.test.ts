import { describe, expect, test } from "vitest";

import {
  buildLabelSessionSnapshot,
  parseLabelSessionSnapshot,
} from "../src/lib/label-session";
import type { EmailRecord } from "../src/lib/serializers";

function createEmailRecord(id: number): EmailRecord {
  return {
    id,
    messageId: `message-${id}`,
    threadId: null,
    senderName: "Sender",
    senderEmail: `sender-${id}@uni.edu`,
    recipientEmail: "student@uni.edu",
    subject: `Subject ${id}`,
    snippet: `Snippet ${id}`,
    bodyText: `Body ${id}`,
    attachmentCount: 0,
    attachmentNamesJson: null,
    contentFingerprint: `fingerprint-${id}`,
    receivedAt: new Date(`2026-05-${String((id % 28) + 1).padStart(2, "0")}T10:00:00Z`).toISOString(),
    label: null,
    category: null,
    notes: null,
    labeledAt: null,
    isLabeled: false,
    source: "import",
    createdAt: new Date("2026-05-01T10:00:00Z").toISOString(),
    updatedAt: new Date("2026-05-01T10:00:00Z").toISOString(),
  };
}

describe("label session recovery snapshots", () => {
  test("stores a bounded trail window around the active email", () => {
    const trail = Array.from({ length: 40 }, (_, index) => createEmailRecord(index + 1));

    const snapshot = buildLabelSessionSnapshot({
      trail,
      index: 20,
      drafts: {
        21: {
          category: "deadline",
          notes: "Unsaved note",
        },
      },
      seenIds: trail.map((email) => email.id),
    });

    expect(snapshot.trail).toHaveLength(25);
    expect(snapshot.trail[0]?.id).toBe(9);
    expect(snapshot.trail.at(-1)?.id).toBe(33);
    expect(snapshot.index).toBe(12);
    expect(snapshot.drafts["21"]).toEqual({
      category: "deadline",
      notes: "Unsaved note",
    });
  });

  test("parses valid snapshots and normalizes seen ids", () => {
    const rawSnapshot = JSON.stringify({
      version: 1,
      savedAt: new Date("2026-05-07T08:00:00Z").toISOString(),
      trail: [createEmailRecord(7)],
      index: 0,
      drafts: {
        7: {
          category: "",
          notes: "Resume here",
        },
      },
      seenIds: [7, 7, 8],
    });

    const snapshot = parseLabelSessionSnapshot(rawSnapshot);

    expect(snapshot).not.toBeNull();
    expect(snapshot?.seenIds).toEqual([7, 8]);
    expect(snapshot?.drafts["7"]?.notes).toBe("Resume here");
  });

  test("rejects malformed snapshots", () => {
    expect(parseLabelSessionSnapshot("not-json")).toBeNull();
    expect(
      parseLabelSessionSnapshot(
        JSON.stringify({
          version: 2,
          savedAt: "2026-05-07T08:00:00Z",
          trail: [],
          index: -1,
          drafts: {},
          seenIds: [],
        }),
      ),
    ).toBeNull();
  });
});

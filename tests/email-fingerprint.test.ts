import { describe, expect, test } from "vitest";

import {
  buildContentFingerprint,
  buildSyntheticMessageId,
} from "../src/lib/email-fingerprint";

describe("email fingerprints", () => {
  test("builds deterministic synthetic ids regardless of batch order", () => {
    const baseInput = {
      senderEmail: "Professor@uni.edu",
      recipientEmail: "student@uni.edu",
      subject: " Assignment deadline ",
      snippet: "Submit by Friday",
      bodyText: "Please upload your report by Friday at 17:00",
      receivedAt: new Date("2026-05-01T09:30:00Z"),
    };

    expect(buildSyntheticMessageId(baseInput)).toBe(
      buildSyntheticMessageId({
        ...baseInput,
        senderEmail: "professor@uni.edu",
        subject: "Assignment deadline",
      }),
    );
    expect(buildContentFingerprint(baseInput)).toHaveLength(64);
  });
});

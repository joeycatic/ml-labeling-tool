import { afterAll, beforeEach, describe, expect, test } from "vitest";

import {
  buildImportPlan,
  commitImportPlan,
  parseImportRequest,
} from "../src/lib/import-emails";
import { getDb } from "../src/lib/db";
import { labelEmail, updateEmail } from "../src/lib/emails";
import { rollbackImportBatch } from "../src/lib/recovery";
import { clearTestDatabase, disconnectTestDatabase } from "./helpers/database";

describe("import preview, audit, and rollback", () => {
  beforeEach(async () => {
    await clearTestDatabase();
  });

  afterAll(async () => {
    await disconnectTestDatabase();
  });

  test("classifies creates, updates, invalid rows, and duplicates in preview", async () => {
    const db = getDb();
    await db.email.create({
      data: {
        messageId: "existing-1",
        senderEmail: "admin@uni.edu",
        subject: "Existing email",
        snippet: "Already there",
        bodyText: "Stored body",
        attachmentCount: 0,
        contentFingerprint: "existing-fingerprint",
        receivedAt: new Date("2026-05-02T10:00:00Z"),
        source: "seed",
      },
    });

    const request = new Request("http://localhost/api/import/preview", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emails: [
          {
            messageId: "existing-1",
            senderEmail: "admin@uni.edu",
            subject: "Existing email",
            snippet: "Already there",
            bodyText: "Stored body",
            receivedAt: "2026-05-02T10:00:00Z",
          },
          {
            senderEmail: "professor@uni.edu",
            subject: "Assignment deadline",
            snippet: "Submit by Friday",
            bodyText: "Upload your report.",
            receivedAt: "2026-05-01T09:30:00Z",
          },
          {
            senderEmail: "professor@uni.edu",
            subject: "Assignment deadline",
            snippet: "Submit by Friday",
            bodyText: "Upload your report.",
            receivedAt: "2026-05-01T09:30:00Z",
          },
          {
            senderEmail: "not-an-email",
            subject: "Broken row",
            snippet: "",
            bodyText: "",
            receivedAt: "2026-05-01T09:30:00Z",
          },
        ],
      }),
    });

    const payload = await parseImportRequest(request);
    const plan = await buildImportPlan(payload);

    expect(plan.totalRows).toBe(4);
    expect(plan.validRows).toBe(2);
    expect(plan.invalidRows).toBe(1);
    expect(plan.duplicateRows).toBe(1);
    expect(plan.projectedCreated).toBe(1);
    expect(plan.projectedUpdated).toBe(1);
  });

  test("records audit events for labeling and editing", async () => {
    const db = getDb();
    const email = await db.email.create({
      data: {
        messageId: "history-1",
        senderEmail: "lecturer@uni.edu",
        subject: "History test",
        snippet: "Snippet",
        bodyText: "Body",
        attachmentCount: 0,
        contentFingerprint: "history-fingerprint",
        receivedAt: new Date("2026-05-03T08:00:00Z"),
        source: "import",
      },
    });

    await labelEmail(email.id, {
      label: "important",
      category: "deadline",
      notes: "Needs quick action",
    });
    await updateEmail(email.id, {
      notes: "Updated note",
    });

    const events = await db.emailChangeEvent.findMany({
      where: { emailId: email.id },
      orderBy: { createdAt: "asc" },
    });

    expect(events).toHaveLength(2);
    expect(events[0]?.eventType).toBe("label-update");
    expect(events[1]?.eventType).toBe("email-edit");
  });

  test("can roll back an import batch", async () => {
    const db = getDb();
    await db.email.create({
      data: {
        messageId: "seed-existing",
        senderEmail: "admin@uni.edu",
        subject: "Old subject",
        snippet: "Old snippet",
        bodyText: "Old body",
        attachmentCount: 0,
        contentFingerprint: "old-fingerprint",
        receivedAt: new Date("2026-05-02T10:00:00Z"),
        source: "import",
      },
    });

    const request = new Request("http://localhost/api/import", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        emails: [
          {
            messageId: "seed-existing",
            senderEmail: "admin@uni.edu",
            subject: "Updated subject",
            snippet: "Updated snippet",
            bodyText: "Updated body",
            receivedAt: "2026-05-02T10:00:00Z",
          },
          {
            senderEmail: "new@uni.edu",
            subject: "Brand new",
            snippet: "Fresh snippet",
            bodyText: "Fresh body",
            receivedAt: "2026-05-04T11:00:00Z",
          },
        ],
      }),
    });

    const payload = await parseImportRequest(request);
    const plan = await buildImportPlan(payload);
    const result = await commitImportPlan(plan, "test-import");

    expect(result.batchId).toBeTruthy();
    expect(await db.email.count()).toBe(2);

    await rollbackImportBatch(result.batchId);

    const emails = await db.email.findMany({
      orderBy: { messageId: "asc" },
    });

    expect(emails).toHaveLength(1);
    expect(emails[0]?.subject).toBe("Old subject");
    expect(await db.importBatch.findUnique({ where: { id: result.batchId } })).toMatchObject({
      status: "rolled_back",
    });
  });
});

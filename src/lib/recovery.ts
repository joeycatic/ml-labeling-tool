import { recordEmailChangeEvent } from "./audit";
import { getDb } from "./db";
import { parseEmailSnapshot, snapshotToEmailData } from "./email-snapshots";
import { badRequest, notFound } from "./errors";

export async function rollbackImportBatch(batchId: string) {
  const db = getDb();

  return db.$transaction(async (transaction) => {
    const batch = await transaction.importBatch.findUnique({
      where: { id: batchId },
    });

    if (!batch) {
      throw notFound("Import batch not found.");
    }

    if (batch.status === "rolled_back") {
      throw badRequest("This import batch has already been rolled back.");
    }

    const events = await transaction.emailChangeEvent.findMany({
      where: { importBatchId: batchId },
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    });

    let deleted = 0;
    let restored = 0;
    let recreated = 0;

    for (const event of events) {
      if (event.eventType === "import-create") {
        const current = await transaction.email.findUnique({
          where: { id: event.emailId },
        });

        if (!current) {
          continue;
        }

        await transaction.email.delete({
          where: { id: current.id },
        });
        deleted += 1;

        await recordEmailChangeEvent({
          db: transaction,
          before: current,
          after: null,
          emailId: current.id,
          eventType: "rollback-delete",
          sourceSurface: "db-rollback-import",
        });
        continue;
      }

      if (event.eventType === "import-update") {
        const beforeSnapshot = parseEmailSnapshot(event.beforeState);

        if (!beforeSnapshot) {
          continue;
        }

        const current = await transaction.email.findUnique({
          where: { messageId: beforeSnapshot.messageId },
        });

        if (current) {
          const updated = await transaction.email.update({
            where: { id: current.id },
            data: snapshotToEmailData(beforeSnapshot),
          });
          restored += 1;

          await recordEmailChangeEvent({
            db: transaction,
            before: current,
            after: updated,
            emailId: updated.id,
            eventType: "rollback-restore",
            sourceSurface: "db-rollback-import",
          });
        } else {
          const recreatedEmail = await transaction.email.create({
            data: snapshotToEmailData(beforeSnapshot),
          });
          recreated += 1;

          await recordEmailChangeEvent({
            db: transaction,
            before: null,
            after: recreatedEmail,
            emailId: recreatedEmail.id,
            eventType: "rollback-recreate",
            sourceSurface: "db-rollback-import",
          });
        }

        continue;
      }

      if (event.eventType === "import-delete") {
        const beforeSnapshot = parseEmailSnapshot(event.beforeState);

        if (!beforeSnapshot) {
          continue;
        }

        const existing = await transaction.email.findUnique({
          where: { messageId: beforeSnapshot.messageId },
        });

        if (existing) {
          continue;
        }

        const recreatedEmail = await transaction.email.create({
          data: snapshotToEmailData(beforeSnapshot),
        });
        recreated += 1;

        await recordEmailChangeEvent({
          db: transaction,
          before: null,
          after: recreatedEmail,
          emailId: recreatedEmail.id,
          eventType: "rollback-recreate",
          sourceSurface: "db-rollback-import",
        });
      }
    }

    await transaction.importBatch.update({
      where: { id: batchId },
      data: {
        status: "rolled_back",
      },
    });

    return {
      batchId,
      deleted,
      restored,
      recreated,
    };
  });
}

-- CreateTable
CREATE TABLE "ImportBatch" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "status" TEXT NOT NULL DEFAULT 'completed',
    "sourceSurface" TEXT NOT NULL,
    "fileCount" INTEGER NOT NULL DEFAULT 0,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "createdCount" INTEGER NOT NULL DEFAULT 0,
    "updatedCount" INTEGER NOT NULL DEFAULT 0,
    "deletedCount" INTEGER NOT NULL DEFAULT 0,
    "removedSeedCount" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "EmailChangeEvent" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "emailId" INTEGER NOT NULL,
    "importBatchId" TEXT,
    "eventType" TEXT NOT NULL,
    "sourceSurface" TEXT NOT NULL,
    "changedFields" TEXT NOT NULL,
    "beforeState" TEXT,
    "afterState" TEXT,
    "labelChanged" BOOLEAN NOT NULL DEFAULT false,
    "emailSubject" TEXT,
    "senderEmail" TEXT,
    "label" TEXT,
    "category" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "EmailChangeEvent_importBatchId_fkey" FOREIGN KEY ("importBatchId") REFERENCES "ImportBatch" ("id") ON DELETE SET NULL ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Email" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "messageId" TEXT NOT NULL,
    "threadId" TEXT,
    "senderName" TEXT,
    "senderEmail" TEXT NOT NULL,
    "recipientEmail" TEXT,
    "subject" TEXT NOT NULL DEFAULT '',
    "snippet" TEXT NOT NULL DEFAULT '',
    "bodyText" TEXT,
    "bodyHtml" TEXT,
    "attachmentCount" INTEGER NOT NULL DEFAULT 0,
    "attachmentNamesJson" TEXT,
    "contentFingerprint" TEXT,
    "receivedAt" DATETIME NOT NULL,
    "label" TEXT,
    "category" TEXT,
    "notes" TEXT,
    "labeledAt" DATETIME,
    "isLabeled" BOOLEAN NOT NULL DEFAULT false,
    "source" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);
INSERT INTO "new_Email" ("bodyHtml", "bodyText", "category", "createdAt", "id", "isLabeled", "label", "labeledAt", "messageId", "notes", "receivedAt", "recipientEmail", "senderEmail", "senderName", "snippet", "source", "subject", "threadId", "updatedAt") SELECT "bodyHtml", "bodyText", "category", "createdAt", "id", "isLabeled", "label", "labeledAt", "messageId", "notes", "receivedAt", "recipientEmail", "senderEmail", "senderName", "snippet", "source", "subject", "threadId", "updatedAt" FROM "Email";
DROP TABLE "Email";
ALTER TABLE "new_Email" RENAME TO "Email";
CREATE UNIQUE INDEX "Email_messageId_key" ON "Email"("messageId");
CREATE INDEX "Email_label_idx" ON "Email"("label");
CREATE INDEX "Email_isLabeled_idx" ON "Email"("isLabeled");
CREATE INDEX "Email_receivedAt_idx" ON "Email"("receivedAt");
CREATE INDEX "Email_senderEmail_idx" ON "Email"("senderEmail");
CREATE INDEX "Email_messageId_idx" ON "Email"("messageId");
CREATE INDEX "Email_category_idx" ON "Email"("category");
CREATE INDEX "Email_isLabeled_receivedAt_idx" ON "Email"("isLabeled", "receivedAt");
CREATE INDEX "Email_contentFingerprint_idx" ON "Email"("contentFingerprint");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "EmailChangeEvent_emailId_createdAt_idx" ON "EmailChangeEvent"("emailId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailChangeEvent_importBatchId_createdAt_idx" ON "EmailChangeEvent"("importBatchId", "createdAt");

-- CreateIndex
CREATE INDEX "EmailChangeEvent_labelChanged_createdAt_idx" ON "EmailChangeEvent"("labelChanged", "createdAt");

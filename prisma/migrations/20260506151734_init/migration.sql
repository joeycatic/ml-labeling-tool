-- CreateTable
CREATE TABLE "Email" (
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

-- CreateIndex
CREATE UNIQUE INDEX "Email_messageId_key" ON "Email"("messageId");

-- CreateIndex
CREATE INDEX "Email_label_idx" ON "Email"("label");

-- CreateIndex
CREATE INDEX "Email_isLabeled_idx" ON "Email"("isLabeled");

-- CreateIndex
CREATE INDEX "Email_receivedAt_idx" ON "Email"("receivedAt");

-- CreateIndex
CREATE INDEX "Email_senderEmail_idx" ON "Email"("senderEmail");

-- CreateIndex
CREATE INDEX "Email_messageId_idx" ON "Email"("messageId");

-- CreateIndex
CREATE INDEX "Email_category_idx" ON "Email"("category");

-- CreateIndex
CREATE INDEX "Email_isLabeled_receivedAt_idx" ON "Email"("isLabeled", "receivedAt");

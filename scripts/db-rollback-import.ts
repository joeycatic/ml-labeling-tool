import { rollbackImportBatch } from "../src/lib/recovery";

async function main() {
  const batchId = process.argv[2];

  if (!batchId) {
    throw new Error("Usage: npm run db:rollback-import -- <batch-id>");
  }

  const result = await rollbackImportBatch(batchId);
  console.log(
    `Rolled back batch ${result.batchId}. Deleted ${result.deleted}, restored ${result.restored}, recreated ${result.recreated}.`,
  );
}

void main();

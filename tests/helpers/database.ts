import { getDb, resetDbClient } from "../../src/lib/db";

export async function clearTestDatabase() {
  await resetDbClient();
  const db = getDb();

  await db.emailChangeEvent.deleteMany();
  await db.importBatch.deleteMany();
  await db.email.deleteMany();
}

export async function disconnectTestDatabase() {
  await resetDbClient();
}

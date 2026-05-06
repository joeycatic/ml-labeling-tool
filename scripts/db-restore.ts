import { resetDbClient } from "../src/lib/db";

import {
  backupDatabase,
  latestBackupPath,
  readCliArg,
  restoreDatabase,
} from "./db-helpers";

async function main() {
  const requestedFile = readCliArg("file");
  const backupPath = requestedFile ?? (await latestBackupPath());

  await resetDbClient();
  await backupDatabase("pre-restore");
  await restoreDatabase(backupPath);
  console.log(`Database restored from ${backupPath}`);
}

void main();

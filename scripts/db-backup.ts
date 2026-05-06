import { backupDatabase, readCliArg } from "./db-helpers";

async function main() {
  const label = readCliArg("name") ?? "backup";
  const backupPath = await backupDatabase(label);
  console.log(`Database backed up to ${backupPath}`);
}

void main();

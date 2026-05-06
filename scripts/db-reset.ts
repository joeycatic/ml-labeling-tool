import { resetDbClient } from "../src/lib/db";

import {
  archiveDatabase,
  removeDatabaseFiles,
  runRepoCommand,
} from "./db-helpers";

async function main() {
  await resetDbClient();
  await archiveDatabase("reset");
  await removeDatabaseFiles();
  runRepoCommand("npx", ["prisma", "migrate", "deploy"]);
  runRepoCommand("npx", ["tsx", "prisma/seed.ts"]);
  console.log("Database reset complete.");
}

void main();

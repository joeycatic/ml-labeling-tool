import path from "node:path";

import { copyDatabaseArtifacts, getRepoRoot } from "../scripts/db-helpers";

export default async function globalSetup() {
  const sourcePath = path.join(getRepoRoot(), "prisma", "dev.db");
  const destinationPath = path.join(getRepoRoot(), "prisma", "test-vitest.db");

  await copyDatabaseArtifacts(sourcePath, destinationPath);
}

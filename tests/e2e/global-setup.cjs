const path = require("node:path");
const { copyFile } = require("node:fs/promises");

async function copyIfPresent(sourcePath, destinationPath) {
  try {
    await copyFile(sourcePath, destinationPath);
  } catch (error) {
    if (error.code !== "ENOENT") {
      throw error;
    }
  }
}

async function globalSetup() {
  const repoRoot = path.resolve(__dirname, "..", "..");
  const sourcePath = path.join(repoRoot, "prisma", "dev.db");
  const destinationPath = path.join(repoRoot, "prisma", "e2e.db");

  await copyIfPresent(sourcePath, destinationPath);
  await copyIfPresent(`${sourcePath}-journal`, `${destinationPath}-journal`);
  await copyIfPresent(`${sourcePath}-wal`, `${destinationPath}-wal`);
  await copyIfPresent(`${sourcePath}-shm`, `${destinationPath}-shm`);
}

module.exports = globalSetup;

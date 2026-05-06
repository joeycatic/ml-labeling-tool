import { access, copyFile } from "node:fs/promises";
import path from "node:path";

import { getDb } from "../src/lib/db";

import { getRepoRoot, runRepoCommand } from "./db-helpers";

async function ensureEnvFile() {
  const envPath = path.join(getRepoRoot(), ".env");
  const envExamplePath = path.join(getRepoRoot(), ".env.example");

  try {
    await access(envPath);
  } catch {
    await copyFile(envExamplePath, envPath);
  }
}

async function seedIfDatabaseIsEmpty() {
  const db = getDb();
  const emailCount = await db.email.count();

  if (emailCount === 0) {
    runRepoCommand("npx", ["tsx", "prisma/seed.ts"]);
  }
}

async function main() {
  await ensureEnvFile();
  runRepoCommand("npx", ["prisma", "migrate", "deploy"]);
  await seedIfDatabaseIsEmpty();
  console.log("Local setup complete.");
}

void main();

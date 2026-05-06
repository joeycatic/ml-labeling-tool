import { copyFile, mkdir, readFile, readdir, rm, stat } from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const prismaDirectory = path.join(repoRoot, "prisma");
const backupDirectory = path.join(repoRoot, "backups", "sqlite");

export function getRepoRoot() {
  return repoRoot;
}

export async function loadDatabaseUrl() {
  if (process.env.DATABASE_URL) {
    return process.env.DATABASE_URL;
  }

  const envPath = path.join(getRepoRoot(), ".env");
  const envContents = await readFile(envPath, "utf8");
  const line = envContents
    .split(/\r?\n/)
    .find((entry) => entry.trim().startsWith("DATABASE_URL="));

  if (!line) {
    throw new Error("DATABASE_URL is not configured.");
  }

  const [, value = ""] = line.split("=");
  return value.trim().replace(/^"|"$/g, "");
}

export async function resolveDatabasePath() {
  const databaseUrl = await loadDatabaseUrl();

  if (!databaseUrl.startsWith("file:")) {
    throw new Error("Only SQLite file DATABASE_URL values are supported.");
  }

  return path.resolve(prismaDirectory, databaseUrl.slice("file:".length));
}

async function copyIfPresent(sourcePath: string, destinationPath: string) {
  try {
    await copyFile(sourcePath, destinationPath);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }
}

export async function copyDatabaseArtifacts(sourcePath: string, destinationPath: string) {
  await copyIfPresent(sourcePath, destinationPath);
  await copyIfPresent(`${sourcePath}-journal`, `${destinationPath}-journal`);
  await copyIfPresent(`${sourcePath}-wal`, `${destinationPath}-wal`);
  await copyIfPresent(`${sourcePath}-shm`, `${destinationPath}-shm`);
}

export async function backupDatabase(label = "backup") {
  const databasePath = await resolveDatabasePath();
  await mkdir(backupDirectory, { recursive: true });
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const backupPath = path.join(backupDirectory, `${timestamp}-${label}.db`);

  await copyDatabaseArtifacts(databasePath, backupPath);

  return backupPath;
}

export async function archiveDatabase(label = "archive") {
  return backupDatabase(label);
}

export async function latestBackupPath() {
  await mkdir(backupDirectory, { recursive: true });
  const entries = await readdir(backupDirectory);
  const files = await Promise.all(
    entries
      .filter((entry) => entry.endsWith(".db"))
      .map(async (entry) => {
        const fullPath = path.join(backupDirectory, entry);
        return {
          fullPath,
          modifiedAt: (await stat(fullPath)).mtimeMs,
        };
      }),
  );

  const latest = files.sort((left, right) => right.modifiedAt - left.modifiedAt)[0];

  if (!latest) {
    throw new Error("No database backups were found.");
  }

  return latest.fullPath;
}

export async function restoreDatabase(backupPath: string) {
  const databasePath = await resolveDatabasePath();
  await mkdir(path.dirname(databasePath), { recursive: true });
  await copyFile(backupPath, databasePath);
}

export async function removeDatabaseFiles() {
  const databasePath = await resolveDatabasePath();

  await Promise.all([
    rm(databasePath, { force: true }),
    rm(`${databasePath}-journal`, { force: true }),
    rm(`${databasePath}-wal`, { force: true }),
    rm(`${databasePath}-shm`, { force: true }),
  ]);
}

export function runRepoCommand(command: string, args: string[], env?: Record<string, string>) {
  const resolvedCommand =
    process.platform === "win32" && command === "npx" ? "npx.cmd" : command;
  const result = spawnSync(resolvedCommand, args, {
    cwd: getRepoRoot(),
    stdio: "inherit",
    env: {
      ...process.env,
      ...env,
    },
  });

  if (result.status !== 0) {
    throw new Error(`Command failed: ${command} ${args.join(" ")}`);
  }
}

export function readCliArg(name: string) {
  const prefix = `--${name}=`;
  const matched = process.argv.find((argument) => argument.startsWith(prefix));
  return matched ? matched.slice(prefix.length) : undefined;
}

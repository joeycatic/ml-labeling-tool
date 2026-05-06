import { archiveDatabase, readCliArg } from "./db-helpers";

async function main() {
  const label = readCliArg("name") ?? "archive";
  const archivePath = await archiveDatabase(label);
  console.log(`Database archived to ${archivePath}`);
}

void main();

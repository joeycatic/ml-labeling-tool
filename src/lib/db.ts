import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as typeof globalThis & {
  prisma?: PrismaClient;
  prismaUrl?: string;
};

export function getDb() {
  const databaseUrl = process.env.DATABASE_URL ?? "";

  if (!globalForPrisma.prisma || globalForPrisma.prismaUrl !== databaseUrl) {
    globalForPrisma.prisma = new PrismaClient();
    globalForPrisma.prismaUrl = databaseUrl;
  }

  return globalForPrisma.prisma;
}

export async function resetDbClient() {
  if (globalForPrisma.prisma) {
    await globalForPrisma.prisma.$disconnect();
  }

  globalForPrisma.prisma = undefined;
  globalForPrisma.prismaUrl = undefined;
}

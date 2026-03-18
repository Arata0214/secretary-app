import { PrismaClient } from "@prisma/client";
import { createClient } from "@libsql/client";
import { PrismaLibSql } from "@prisma/adapter-libsql";

const globalForPrisma = global as unknown as { prisma: PrismaClient };

const url = process.env.DATABASE_URL || "file:./dev.db";

const libsql = createClient({
  url: url,
  authToken: process.env.DATABASE_AUTH_TOKEN,
});

const adapter = new PrismaLibSql(libsql as any);

const prisma = globalForPrisma.prisma || new PrismaClient({ adapter });

if (process.env.NODE_ENV !== "development") {
  if (!globalForPrisma.prisma) globalForPrisma.prisma = prisma;
}

export { prisma };

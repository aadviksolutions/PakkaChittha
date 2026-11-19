import { PrismaClient } from '@prisma/client';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  });

// Always retain prisma client instance on globalThis across all environments (including production serverless)
// to reuse connection pools and avoid expensive TCP/SSL renegotiation on warm function invocations
globalForPrisma.prisma = prisma;

export default prisma;

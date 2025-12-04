import { PrismaClient } from '@task-manager/prisma-client';

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

export default prisma;
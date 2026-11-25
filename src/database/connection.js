import { PrismaClient } from '@prisma/client';

export const prisma = new PrismaClient({ log: ['warn', 'error'] });

export async function connectDatabase() {
  await prisma.$connect();
  console.log('🗄️  PostgreSQL (Neon) bazasiga ulanildi');
}

export async function disconnectDatabase() {
  await prisma.$disconnect();
}

export default prisma;

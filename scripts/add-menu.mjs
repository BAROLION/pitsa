// `npm run db:add-menu` — seedData.js dagi, lekin bazada hali yo'q mahsulotlarni qo'shadi.
// Bor mahsulotlarga (admin tahrirlaganlariga ham) tegmaydi.
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { SEED_PRODUCTS } from '../src/database/seedData.js';

const prisma = new PrismaClient();

try {
  const existing = new Set((await prisma.product.findMany({ select: { name: true } })).map((p) => p.name));
  const missing = SEED_PRODUCTS.filter((product) => !existing.has(product.name));

  if (missing.length === 0) {
    console.log('ℹ️  Barcha mahsulotlar bazada bor — hech narsa qo‘shilmadi.');
  } else {
    await prisma.product.createMany({ data: missing });
    console.log(`✅ ${missing.length} ta yangi mahsulot qo‘shildi:`);
    for (const product of missing) console.log(`   • ${product.category} — ${product.name}`);
  }
} catch (error) {
  console.error('❌ Xato:', error.message);
  process.exitCode = 1;
} finally {
  await prisma.$disconnect();
}

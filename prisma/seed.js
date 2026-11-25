// `npm run db:seed` — boshlang'ich mahsulotlarni bazaga yozadi (agar baza bo'sh bo'lsa).
import 'dotenv/config';
import { PrismaClient } from '@prisma/client';
import { SEED_PRODUCTS } from '../src/database/seedData.js';

const prisma = new PrismaClient();

async function main() {
  const count = await prisma.product.count();

  if (count > 0) {
    console.log(`ℹ️  Bazada allaqachon ${count} ta mahsulot bor — seed o‘tkazib yuborildi.`);
    return;
  }

  await prisma.product.createMany({ data: SEED_PRODUCTS });
  console.log(`✅ ${SEED_PRODUCTS.length} ta mahsulot bazaga yozildi.`);
}

main()
  .catch((error) => {
    console.error('❌ Seed xatosi:', error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

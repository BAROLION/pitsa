import prisma from '../database/connection.js';
import { SEED_PRODUCTS } from '../database/seedData.js';

const toPrice = (value) => Math.max(0, Math.round(Number(value) || 0));

/** Admin formasidan kelgan ma'lumotni tozalaydi. */
function normalize(data) {
  const ingredients = Array.isArray(data.ingredients)
    ? data.ingredients
    : String(data.ingredients || '').split(',');

  const newPrice = toPrice(data.newPrice);

  return {
    name: String(data.name || '').trim(),
    description: String(data.description || '').trim(),
    ingredients: ingredients.map((item) => String(item).trim()).filter(Boolean),
    imageUrl: String(data.imageUrl || '').trim(),
    oldPrice: toPrice(data.oldPrice) || newPrice,
    newPrice,
    category: String(data.category || '').trim() || 'Pizza',
    isActive: data.isActive === undefined ? true : Boolean(data.isActive),
  };
}

const ProductModel = {
  normalize,

  listActive() {
    return prisma.product.findMany({ where: { isActive: true }, orderBy: { id: 'asc' } });
  },

  listAll() {
    return prisma.product.findMany({ orderBy: { id: 'asc' } });
  },

  findManyByIds(ids) {
    return prisma.product.findMany({ where: { id: { in: ids } } });
  },

  async categories() {
    const rows = await prisma.product.findMany({
      where: { isActive: true },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    });
    return rows.map((row) => row.category);
  },

  create(data) {
    return prisma.product.create({ data: normalize(data) });
  },

  update(id, data) {
    return prisma.product.update({ where: { id }, data: normalize(data) });
  },

  remove(id) {
    return prisma.product.delete({ where: { id } });
  },

  count() {
    return prisma.product.count();
  },

  /** Baza bo'sh bo'lsa boshlang'ich mahsulotlarni yozadi. */
  async seedIfEmpty() {
    if ((await prisma.product.count()) > 0) return 0;
    const { count } = await prisma.product.createMany({ data: SEED_PRODUCTS });
    return count;
  },
};

export default ProductModel;

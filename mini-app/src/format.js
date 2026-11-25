export const money = (value) =>
  `${Number(value || 0).toLocaleString('ru-RU').replace(/[\s  ]/g, ' ')} so‘m`;

export const formatDate = (value) =>
  new Date(value).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

export const formatClock = (value) =>
  new Date(value).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });

/** Yetib borishgacha qolgan daqiqa (manfiy — kechikmoqda). */
export const minutesLeft = (value) => Math.round((new Date(value).getTime() - Date.now()) / 60_000);

/** Mijoz buyurtmani shu vaqt ichida bekor qila oladi (serverdagi bilan bir xil). */
export const CANCEL_WINDOW_MS = 5 * 60_000;

/** Bekor qilish uchun qolgan soniyalar (0 — muddat tugagan yoki bekor qilib bo'lmaydi). */
export const cancelSecondsLeft = (order) =>
  order.status === 'KUTILMOQDA'
    ? Math.max(0, Math.floor((new Date(order.createdAt).getTime() + CANCEL_WINDOW_MS - Date.now()) / 1000))
    : 0;

export const formatCountdown = (seconds) => `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;

export const STATUS = {
  KUTILMOQDA: { label: 'Tayyorlanmoqda', tone: 'warn' },
  YOLDA: { label: 'Yo‘lda', tone: 'info' },
  YETKAZILDI: { label: 'Yetkazildi', tone: 'ok' },
  BEKOR_QILINDI: { label: 'Bekor qilindi', tone: 'bad' },
};

// Menyuda ko'rinish tartibi va belgilari. Admin yangi kategoriya qo'shsa — oxirida, 🍽️ bilan.
const CATEGORIES = [
  ['Barchasi', '🍽️'],
  ['Klassik', '🍕'],
  ['Go‘shtli', '🥩'],
  ['Milliy', '🫓'],
  ['Pishloqli', '🧀'],
  ['Burger', '🍔'],
  ['Hot-dog', '🌭'],
  ['Lavash', '🌯'],
  ['Gazaklar', '🍟'],
  ['Desert', '🍰'],
  ['Ichimlik', '🥤'],
];
const CATEGORY_EMOJI = Object.fromEntries(CATEGORIES);
const CATEGORY_RANK = Object.fromEntries(CATEGORIES.map(([name], i) => [name, i]));

export const categoryEmoji = (category) => CATEGORY_EMOJI[category] || '🍽️';

const rank = (category) => CATEGORY_RANK[category] ?? CATEGORIES.length;

/** Mahsulotlarni kategoriya tartibida saralaydi (bir kategoriya ichida — qo'shilish tartibida). */
export const sortByCategory = (products) =>
  [...products].sort((a, b) => rank(a.category) - rank(b.category) || a.id - b.id);

/** Noyob kategoriyalar ro'yxati, "Barchasi" birinchi. */
export const categoryList = (products) => ['Barchasi', ...new Set(sortByCategory(products).map((p) => p.category))];

/** Pizzalarmi? (4 ta pizza kategoriyasi) */
export const isPizza = (product) => rank(product.category) >= 1 && rank(product.category) <= 4;

/** Qidiruv: nom, kategoriya va tarkib bo'yicha (katta-kichik harf farqsiz). */
export function matchesQuery(product, query) {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  return [product.name, product.category, ...(product.ingredients || [])]
    .join(' ')
    .toLowerCase()
    .includes(q);
}

/** localStorage ba'zi WebView'larda bloklangan bo'lishi mumkin. */
export const storage = {
  get(key, fallback = null) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch {
      return fallback;
    }
  },
  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* ignore */
    }
  },
};

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

export const STATUS = {
  KUTILMOQDA: { label: 'Kutilmoqda', tone: 'warn' },
  YOLDA: { label: 'Yo‘lda', tone: 'info' },
  YETKAZILDI: { label: 'Yetkazildi', tone: 'ok' },
  BEKOR_QILINDI: { label: 'Bekor qilingan', tone: 'bad' },
};

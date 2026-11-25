export const tg = window.Telegram?.WebApp;

export function initTelegram() {
  if (!tg) return;
  try {
    tg.ready();
    tg.expand();
    tg.setHeaderColor?.('#ffd400');
    tg.setBackgroundColor?.('#ffffff');
    tg.setBottomBarColor?.('#ffffff');
    tg.disableVerticalSwipes?.();
  } catch {
    /* eski Telegram versiyalari */
  }
}

/** Telegram'ning yuqori panel rangini sahifaga moslaydi. */
export function setHeaderColor(color) {
  try {
    tg?.setHeaderColor?.(color);
  } catch {
    /* ignore */
  }
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', color);
}

export const getInitData = () => tg?.initData || '';

export const getTelegramUser = () => tg?.initDataUnsafe?.user || null;

export function haptic(type = 'light') {
  try {
    if (['success', 'error', 'warning'].includes(type)) tg?.HapticFeedback?.notificationOccurred(type);
    else tg?.HapticFeedback?.impactOccurred(type);
  } catch {
    /* ignore */
  }
}

/**
 * Foydalanuvchining joriy joylashuvi.
 * Avval Telegram'ning LocationManager'i (Bot API 8.0+), bo'lmasa brauzer geolocation.
 * Natija: { lat, lng } yoki xato (error.code: 'denied' | 'unavailable').
 */
export function getLocation() {
  const fail = (code, message) => Object.assign(new Error(message), { code });

  const fromBrowser = () =>
    new Promise((resolve, reject) => {
      if (!navigator.geolocation) return reject(fail('unavailable', 'Qurilmangiz joylashuvni aniqlay olmaydi'));
      navigator.geolocation.getCurrentPosition(
        (position) => resolve({ lat: position.coords.latitude, lng: position.coords.longitude }),
        (error) =>
          reject(
            error.code === 1
              ? fail('denied', 'Joylashuvga ruxsat berilmadi')
              : fail('unavailable', 'Joylashuvni aniqlab bo‘lmadi. Xaritadan tanlang.'),
          ),
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 },
      );
    });

  const manager = tg?.LocationManager;
  if (!manager || !tg.isVersionAtLeast?.('8.0')) return fromBrowser();

  return new Promise((resolve, reject) => {
    const ask = () => {
      if (!manager.isLocationAvailable) return fromBrowser().then(resolve, reject);
      manager.getLocation((data) => {
        if (data) return resolve({ lat: data.latitude, lng: data.longitude });
        reject(fail('denied', 'Joylashuvga ruxsat berilmadi'));
      });
    };
    try {
      if (manager.isInited) ask();
      else manager.init(ask);
    } catch {
      fromBrowser().then(resolve, reject);
    }
  });
}

/** Telegram'da joylashuv ruxsati sozlamasini ochadi (ruxsat rad etilgan bo'lsa). */
export function openLocationSettings() {
  try {
    if (tg?.LocationManager?.isAccessRequested && !tg.LocationManager.isAccessGranted) {
      tg.LocationManager.openSettings();
      return true;
    }
  } catch {
    /* ignore */
  }
  return false;
}

/** Telegram'ning o'z tasdiqlash oynasi (brauzerda — oddiy confirm). */
export function confirmAction(message) {
  return new Promise((resolve) => {
    try {
      if (tg?.showConfirm && tg.isVersionAtLeast?.('6.2')) {
        tg.showConfirm(message, (ok) => resolve(Boolean(ok)));
        return;
      }
    } catch {
      /* eski versiya */
    }
    resolve(window.confirm(message));
  });
}

export function closeApp() {
  try {
    tg?.close();
  } catch {
    /* ignore */
  }
}

import { storage } from './format.js';

// Toshkent markazi — joylashuv hali tanlanmagan bo'lsa xarita shu yerdan boshlanadi.
export const DEFAULT_CENTER = { lat: 41.311081, lng: 69.240562 };

const LOCATION_KEY = 'pizza_last_location';
const LEGACY_ADDRESS_KEY = 'pizza_last_address';

const round = (value) => Math.round(Number(value) * 1e6) / 1e6;

/** Oxirgi tanlangan joylashuv: { lat, lng, address } yoki null. */
export function loadSavedLocation() {
  const saved = storage.get(LOCATION_KEY, null);
  if (saved && Number.isFinite(saved.lat) && Number.isFinite(saved.lng)) return saved;
  return null;
}

export function saveLocation(location) {
  storage.set(LOCATION_KEY, { lat: round(location.lat), lng: round(location.lng), address: location.address || '' });
}

/** Bosh sahifa sarlavhasi uchun qisqa manzil. */
export function savedAddressLabel() {
  return loadSavedLocation()?.address || storage.get(LEGACY_ADDRESS_KEY, '') || '';
}

/** Buyurtma manzili matnidagi xarita havolasidan koordinata (…?q=41.31,69.24). */
export function destinationOf(orderLocation) {
  const match = String(orderLocation || '').match(/[?&]q=(-?\d+(?:\.\d+)?),(-?\d+(?:\.\d+)?)/);
  return match ? { lat: Number(match[1]), lng: Number(match[2]) } : null;
}

/** Ikki nuqta orasidagi masofa (km, to'g'ri chiziq bo'yicha). */
export function distanceKm(a, b) {
  if (!a || !b) return null;
  const rad = (deg) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

export const mapLink = ({ lat, lng }) => `https://maps.google.com/?q=${round(lat)},${round(lng)}`;

export const formatCoords = ({ lat, lng }) => `${round(lat).toFixed(5)}, ${round(lng).toFixed(5)}`;

// O'zbekiston chegaralari (qidiruv faqat shu hudud ichida)
const UZ_BBOX = '55.9,37.1,73.2,45.6';

const PLACE_KINDS = {
  place: 'area', // mahalla, daha, tuman, shahar
  boundary: 'area',
  highway: 'road',
  building: 'building',
  amenity: 'building',
  office: 'building',
  shop: 'building',
  tourism: 'building',
  leisure: 'building',
  healthcare: 'building',
};

/**
 * Joy qidirish: mahalla, ko'cha, ishxona, do'kon, mo'ljal... (OpenStreetMap / Photon).
 * Natijalar xarita markaziga yaqinlari birinchi.
 * → [{ id, lat, lng, title, subtitle, kind: 'area' | 'road' | 'building' | 'pin' }]
 */
export async function searchPlaces(query, near, signal) {
  const q = query.trim();
  if (q.length < 2) return [];
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&limit=8&bbox=${UZ_BBOX}` +
    (near ? `&lat=${round(near.lat)}&lon=${round(near.lng)}&location_bias_scale=0.4` : '');
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error('Qidiruv vaqtincha ishlamayapti');
  const data = await res.json();

  const seen = new Set();
  return (data.features || [])
    .map((feature) => {
      const p = feature.properties || {};
      const [lng, lat] = feature.geometry?.coordinates || [];
      const street = [p.street, p.housenumber].filter(Boolean).join(', ');
      const title = p.name || street || p.district || p.city || '';
      const subtitle = [...new Set([p.name ? street : '', p.district, p.city || p.county, p.state].filter(Boolean))]
        .filter((part) => part !== title)
        .join(', ');
      return {
        id: `${p.osm_type}${p.osm_id}`,
        lat,
        lng,
        title,
        subtitle,
        kind: PLACE_KINDS[p.osm_key] || 'pin',
      };
    })
    .filter((place) => {
      if (!place.title || !Number.isFinite(place.lat)) return false;
      const key = `${place.title}|${place.subtitle}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

/** Qidiruvda tanlangan joyning manzil sifatidagi to'liq nomi. */
export const placeLabel = (place) => [place.title, place.subtitle].filter(Boolean).join(', ');

/**
 * Koordinatadan odam o'qiy oladigan manzil (OpenStreetMap / Nominatim).
 * Topilmasa — bo'sh satr (koordinata baribir yuboriladi).
 */
export async function reverseGeocode({ lat, lng }, signal) {
  const url =
    'https://nominatim.openstreetmap.org/reverse?format=jsonv2&zoom=18&addressdetails=1' +
    `&accept-language=uz-Latn,uz,ru&lat=${round(lat)}&lon=${round(lng)}`;
  const res = await fetch(url, { signal });
  if (!res.ok) return '';
  const data = await res.json();
  const a = data.address || {};

  const street = [a.road || a.pedestrian || a.footway || a.residential, a.house_number].filter(Boolean).join(', ');
  const area = a.neighbourhood || a.quarter || a.suburb || a.city_district || a.district;
  const city = a.city || a.town || a.village || a.county;
  const parts = [street || data.name, area, city].filter(Boolean);

  // Takrorlarni olib tashlaymiz (masalan, mahalla va tuman bir xil nomlansa)
  const unique = [...new Set(parts)];
  return unique.join(', ') || data.display_name || '';
}

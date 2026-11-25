// Zamonaviy vektor xarita: MapLibre GL + OpenFreeMap (bepul, API kalitsiz, tijoriy foydalanish mumkin).
import { Map as MapLibreMap, Marker, setWorkerUrl } from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
// MapLibre xarita plitkalarini alohida "worker"da chizadi — Vite uni alohida fayl sifatida beradi
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?url';

setWorkerUrl(workerUrl);

export const STYLE_URL = 'https://tiles.openfreemap.org/styles/liberty';

/** Yozuvlar: o'zbekcha nom bo'lsa — o'zbekcha, bo'lmasa lotin yozuvida, bo'lmasa asl nomi. */
const LABEL = ['coalesce', ['get', 'name:uz'], ['get', 'name:latin'], ['get', 'name']];

function localizeLabels(map) {
  for (const layer of map.getStyle().layers || []) {
    if (layer.type !== 'symbol') continue;
    const field = map.getLayoutProperty(layer.id, 'text-field');
    if (!field) continue;
    const text = JSON.stringify(field);
    // Uy raqamlari, yo'l raqamlari (M39) — o'zgartirilmaydi
    if (!text.includes('name') || text.includes('housenumber')) continue;
    map.setLayoutProperty(layer.id, 'text-field', LABEL);
  }
}

/** Xarita yaratadi. center: { lat, lng } */
export function createMap(container, { center, zoom }) {
  const map = new MapLibreMap({
    container,
    style: STYLE_URL,
    center: [center.lng, center.lat],
    zoom,
    attributionControl: { compact: true },
    dragRotate: false,
    pitchWithRotate: false,
    touchPitch: false,
    maxZoom: 19,
  });
  map.touchZoomRotate.disableRotation();
  map.on('style.load', () => localizeLabels(map));
  return map;
}

/** Emoji belgili xarita markeri (🛵, 🏠). */
export function emojiMarker(className, emoji) {
  const element = document.createElement('div');
  element.className = `mk ${className}`;
  element.innerHTML = `<span>${emoji}</span>`;
  return new Marker({ element });
}

/** Markerni yangi joyga silliq ko'chiradi (~1 soniya). */
export function glideMarker(marker, to, duration = 1000) {
  const from = marker.getLngLat();
  const start = performance.now();
  cancelAnimationFrame(marker.__glide);
  const step = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const ease = t * (2 - t);
    marker.setLngLat([from.lng + (to.lng - from.lng) * ease, from.lat + (to.lat - from.lat) * ease]);
    if (t < 1) marker.__glide = requestAnimationFrame(step);
  };
  marker.__glide = requestAnimationFrame(step);
}

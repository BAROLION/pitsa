import { useEffect, useRef } from 'react';
import { createMap, emojiMarker, glideMarker } from '../map/baseMap.js';

const TASHKENT = { lat: 41.311081, lng: 69.240562 };

/**
 * Kuzatish xaritasi: 🏠 yetkazish manzili va 🛵 kuryer.
 * Kuryer joylashuvi yangilanganda marker silliq ko'chadi; kuryer ko'rinmay qolsa — ikkalasi sig'adigan qilib suriladi.
 */
export default function TrackMap({ destination, courier }) {
  const elRef = useRef(null);
  const mapRef = useRef(null);
  const homeRef = useRef(null);
  const courierRef = useRef(null);
  const fittedRef = useRef(false);
  const pointsRef = useRef([]);

  /** Uy va kuryer ikkalasi ko'rinadigan qilib xaritani moslaydi. */
  const fit = (duration) => {
    const map = mapRef.current;
    const points = pointsRef.current;
    if (!map || points.length === 0) return;
    if (points.length === 1) {
      map.easeTo({ center: [points[0].lng, points[0].lat], zoom: 16, duration });
    } else {
      const lngs = points.map((p) => p.lng);
      const lats = points.map((p) => p.lat);
      map.fitBounds(
        [
          [Math.min(...lngs), Math.min(...lats)],
          [Math.max(...lngs), Math.max(...lats)],
        ],
        { padding: { top: 64, left: 56, right: 56, bottom: 72 }, maxZoom: 17, duration },
      );
    }
    fittedRef.current = true;
  };

  useEffect(() => {
    const map = createMap(elRef.current, { center: courier || destination || TASHKENT, zoom: 15 });
    mapRef.current = map;
    // Konteyner o'lchami aniq bo'lgach — qayta moslaymiz (aks holda belgilar chetga chiqib qoladi)
    const refit = () => {
      map.resize();
      fit(0);
    };
    map.once('load', refit);
    const timer = setTimeout(refit, 300);
    return () => {
      clearTimeout(timer);
      map.remove();
      mapRef.current = null;
      homeRef.current = null;
      courierRef.current = null;
      fittedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (destination) {
      if (!homeRef.current) homeRef.current = emojiMarker('mk--home', '🏠').setLngLat([destination.lng, destination.lat]).addTo(map);
      else homeRef.current.setLngLat([destination.lng, destination.lat]);
    }

    if (courier) {
      if (!courierRef.current) {
        courierRef.current = emojiMarker('mk--courier', '🛵').setLngLat([courier.lng, courier.lat]).addTo(map);
      } else {
        glideMarker(courierRef.current, courier);
      }
    } else if (courierRef.current) {
      courierRef.current.remove();
      courierRef.current = null;
    }

    const points = [destination, courier].filter(Boolean);
    pointsRef.current = points;
    if (points.length === 0) return;

    const bounds = map.getBounds();
    const outOfView = points.some((p) => !bounds.contains([p.lng, p.lat]));
    if (fittedRef.current && !outOfView) return;
    fit(fittedRef.current ? 800 : 0);
  }, [destination?.lat, destination?.lng, courier?.lat, courier?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="track-map" ref={elRef} />;
}

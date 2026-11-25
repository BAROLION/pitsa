import { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

const icon = (className, emoji) =>
  L.divIcon({
    className: '',
    html: `<div class="mk ${className}"><span>${emoji}</span></div>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });

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

  useEffect(() => {
    const start = courier || destination;
    const map = L.map(elRef.current, {
      zoomControl: false,
      attributionControl: true,
      center: start ? [start.lat, start.lng] : [41.311081, 69.240562],
      zoom: 15,
    });
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; OpenStreetMap',
    }).addTo(map);
    map.attributionControl.setPrefix(false);
    mapRef.current = map;
    const timer = setTimeout(() => map.invalidateSize(), 200);
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
      if (!homeRef.current) homeRef.current = L.marker([destination.lat, destination.lng], { icon: icon('mk--home', '🏠') }).addTo(map);
      else homeRef.current.setLatLng([destination.lat, destination.lng]);
    }

    if (courier) {
      if (!courierRef.current) {
        courierRef.current = L.marker([courier.lat, courier.lng], { icon: icon('mk--courier', '🛵'), zIndexOffset: 1000 }).addTo(map);
      } else {
        courierRef.current.setLatLng([courier.lat, courier.lng]);
      }
    } else if (courierRef.current) {
      courierRef.current.remove();
      courierRef.current = null;
    }

    const points = [destination, courier].filter(Boolean).map((p) => [p.lat, p.lng]);
    if (points.length === 0) return;

    const outOfView = points.some((p) => !map.getBounds().contains(p));
    if (!fittedRef.current || outOfView) {
      if (points.length === 1) map.setView(points[0], 16, { animate: fittedRef.current });
      else map.fitBounds(points, { padding: [56, 56], maxZoom: 17, animate: fittedRef.current });
      fittedRef.current = true;
    }
  }, [destination?.lat, destination?.lng, courier?.lat, courier?.lng]); // eslint-disable-line react-hooks/exhaustive-deps

  return <div className="track-map" ref={elRef} />;
}

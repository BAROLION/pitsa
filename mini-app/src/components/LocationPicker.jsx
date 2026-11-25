import { useEffect, useRef, useState } from 'react';
import { createMap } from '../map/baseMap.js';
import Icon from './Icon.jsx';
import { tg, haptic, getLocation, openLocationSettings } from '../telegram.js';
import { DEFAULT_CENTER, reverseGeocode, searchPlaces, placeLabel, formatCoords } from '../geo.js';

const KIND_ICON = { area: 'home', road: 'road', building: 'building', pin: 'pin' };

/**
 * To'liq ekranli xarita: markazdagi pin ostidagi nuqta — yetkazish manzili.
 * Mijoz joy nomini qidiradi (mahalla, ishxona, mo'ljal), xaritani suradi
 * yoki "Mening joylashuvim" tugmasini bosadi.
 */
export default function LocationPicker({ initial, onPick, onClose }) {
  const mapEl = useRef(null);
  const mapRef = useRef(null);
  const inputRef = useRef(null);
  const pickedLabelRef = useRef('');

  const [center, setCenter] = useState(initial || DEFAULT_CENTER);
  const [address, setAddress] = useState(initial?.address || '');
  const [resolving, setResolving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [locating, setLocating] = useState(false);
  const [error, setError] = useState('');
  const [canOpenSettings, setCanOpenSettings] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');

  const closeSearch = () => {
    setSearchOpen(false);
    setQuery('');
    setResults([]);
    setSearchError('');
    inputRef.current?.blur();
  };

  const locate = async ({ silent = false } = {}) => {
    setLocating(true);
    setError('');
    setCanOpenSettings(false);
    try {
      const position = await getLocation();
      pickedLabelRef.current = '';
      mapRef.current?.flyTo({ center: [position.lng, position.lat], zoom: 17, duration: 800 });
      haptic('success');
    } catch (locationError) {
      if (!silent) {
        haptic('warning');
        setError(`${locationError.message}. Joy nomini qidiring yoki xaritani suring.`);
        setCanOpenSettings(locationError.code === 'denied' && Boolean(tg?.LocationManager?.isAccessRequested));
      }
    } finally {
      setLocating(false);
    }
  };

  const choosePlace = (place) => {
    haptic('light');
    const label = placeLabel(place);
    pickedLabelRef.current = label;
    setAddress(label);
    setError('');
    closeSearch();
    mapRef.current?.flyTo({ center: [place.lng, place.lat], zoom: place.kind === 'area' ? 16 : 17, duration: 800 });
  };

  // Xarita
  useEffect(() => {
    const start = initial || DEFAULT_CENTER;
    const map = createMap(mapEl.current, { center: start, zoom: initial ? 17 : 13 });

    map.on('movestart', () => setMoving(true));
    map.on('dragstart', () => {
      pickedLabelRef.current = '';
    });
    map.on('moveend', () => {
      const c = map.getCenter();
      setMoving(false);
      setCenter({ lat: c.lat, lng: c.lng });
    });

    mapRef.current = map;
    const sizeTimer = setTimeout(() => map.resize(), 250);

    // Birinchi marta ochilganda — joylashuvni o'zi aniqlashga urinadi
    if (!initial) locate({ silent: true });

    return () => {
      clearTimeout(sizeTimer);
      map.remove();
      mapRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Pin ostidagi manzil nomi (surish to'xtagach). Qidiruvdan tanlangan bo'lsa — o'sha nom qoladi.
  useEffect(() => {
    if (moving) return undefined;
    if (pickedLabelRef.current) {
      setAddress(pickedLabelRef.current);
      setResolving(false);
      return undefined;
    }
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      setResolving(true);
      try {
        setAddress(await reverseGeocode(center, controller.signal));
      } catch {
        if (!controller.signal.aborted) setAddress('');
      } finally {
        if (!controller.signal.aborted) setResolving(false);
      }
    }, 450);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [center, moving]);

  // Qidiruv (yozib bo'lgach 400 ms kutib)
  useEffect(() => {
    const q = query.trim();
    setSearchError('');
    if (q.length < 2) {
      setResults([]);
      setSearching(false);
      return undefined;
    }
    setSearching(true);
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const near = mapRef.current?.getCenter();
        setResults(await searchPlaces(q, near && { lat: near.lat, lng: near.lng }, controller.signal));
      } catch (searchFailure) {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearchError(searchFailure.message || 'Qidiruvda xatolik');
        }
      } finally {
        if (!controller.signal.aborted) setSearching(false);
      }
    }, 400);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [query]);

  // Telegram "Orqaga" tugmasi: avval qidiruvni yopadi, keyin xaritani
  const searchOpenRef = useRef(searchOpen);
  searchOpenRef.current = searchOpen;
  useEffect(() => {
    const back = tg?.BackButton;
    const onBack = () => (searchOpenRef.current ? closeSearch() : onClose());
    try {
      back?.onClick(onBack);
      back?.show();
    } catch {
      /* eski versiya */
    }
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      try {
        back?.offClick(onBack);
        back?.hide();
      } catch {
        /* ignore */
      }
      document.body.style.overflow = overflow;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onClose]);

  const confirm = () => {
    haptic('success');
    onPick({ lat: center.lat, lng: center.lng, address });
  };

  const hasQuery = query.trim().length >= 2;

  return (
    <div className="picker" role="dialog" aria-modal="true" aria-label="Yetkazish manzilini tanlash">
      <div className="picker__map" ref={mapEl} />

      <div className={`picker__pin ${moving ? 'picker__pin--up' : ''}`} aria-hidden="true">
        <span className="picker__pin-head">
          <Icon name="pin" size={22} stroke={2.6} />
        </span>
        <span className="picker__pin-leg" />
        <span className="picker__pin-shadow" />
      </div>

      {/* Qidiruv paneli */}
      <div className={`picker__top ${searchOpen ? 'picker__top--open' : ''}`}>
        <button
          className="picker__back"
          onClick={() => (searchOpen ? closeSearch() : onClose())}
          aria-label={searchOpen ? 'Qidiruvni yopish' : 'Orqaga'}
        >
          <Icon name="chevronLeft" size={24} stroke={2.6} />
        </button>
        <label className="picker__search">
          <Icon name="search" size={20} stroke={2.4} />
          <input
            ref={inputRef}
            type="search"
            enterKeyHint="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && results[0]) choosePlace(results[0]);
            }}
            placeholder="Mahalla, ko‘cha yoki ishxona"
            aria-label="Manzilni qidirish"
            autoComplete="off"
          />
          {query && (
            <button
              type="button"
              className="picker__clear"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
              aria-label="Tozalash"
            >
              <Icon name="close" size={16} stroke={3} />
            </button>
          )}
        </label>
      </div>

      {searchOpen && (
        <div className="picker__results" role="listbox" aria-label="Qidiruv natijalari">
          <button
            className="result"
            onClick={() => {
              closeSearch();
              locate();
            }}
          >
            <span className="result__icon result__icon--brand">
              <Icon name="locate" size={20} stroke={2.4} />
            </span>
            <span className="result__body">
              <span className="result__title">Mening joylashuvim</span>
              <span className="result__sub">Telefoningiz turgan joy</span>
            </span>
          </button>

          {!hasQuery && (
            <div className="results__hint">
              <b>Qidirish mumkin:</b> mahalla, ko‘cha, ishxona, bino, do‘kon, maktab yoki mo‘ljal nomi.
              <br />
              Masalan: <i>Beshyog‘och</i>, <i>IT Park</i>, <i>Chorsu</i>
            </div>
          )}

          {hasQuery && searching && results.length === 0 && <div className="results__state">Qidirilmoqda...</div>}

          {hasQuery && !searching && !searchError && results.length === 0 && (
            <div className="results__state">
              Hech narsa topilmadi. Boshqacha yozib ko‘ring yoki xaritadan tanlang.
            </div>
          )}

          {searchError && <div className="results__state">{searchError}</div>}

          {results.map((place) => (
            <button key={place.id} className="result" role="option" onClick={() => choosePlace(place)}>
              <span className="result__icon">
                <Icon name={KIND_ICON[place.kind]} size={19} stroke={2.2} />
              </span>
              <span className="result__body">
                <span className="result__title">{place.title}</span>
                {place.subtitle && <span className="result__sub">{place.subtitle}</span>}
              </span>
            </button>
          ))}

          <button className="results__map" onClick={closeSearch}>
            <Icon name="pin" size={18} stroke={2.4} /> Xaritadan o‘zim tanlayman
          </button>
        </div>
      )}

      <div className="picker__sheet">
        <button
          className="picker__locate"
          onClick={() => locate()}
          disabled={locating}
          aria-label="Mening joylashuvim"
        >
          {locating ? <span className="spinner spinner--sm" /> : <Icon name="locate" size={22} stroke={2.4} />}
        </button>

        <div className="picker__label">Yetkazish manzili</div>
        <div className={`picker__address ${moving || resolving ? 'picker__address--busy' : ''}`} aria-live="polite">
          {moving
            ? 'Pinni uyingiz ustiga qo‘ying...'
            : resolving
              ? 'Manzil aniqlanmoqda...'
              : address || `Xaritadagi nuqta · ${formatCoords(center)}`}
        </div>

        {error && (
          <div className="picker__error" role="alert">
            {error}
            {canOpenSettings && (
              <button className="picker__link" onClick={openLocationSettings}>
                Ruxsat berish
              </button>
            )}
          </div>
        )}

        <button className="btn btn--primary btn--lg" onClick={confirm} disabled={moving || locating}>
          Shu manzilni tanlash
        </button>
      </div>
    </div>
  );
}

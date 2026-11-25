import { useEffect, useState } from 'react';

const FALLBACK =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 200"><rect width="200" height="200" fill="#f5f6f8"/><text x="100" y="122" font-size="64" text-anchor="middle">🍕</text></svg>',
  );

/** Rasm yuklanmasa chiroyli zaxira rasm ko'rsatadi. */
export default function SafeImage({ src, alt = '', ...rest }) {
  const [source, setSource] = useState(src || FALLBACK);

  useEffect(() => setSource(src || FALLBACK), [src]);

  return <img {...rest} src={source} alt={alt} loading="lazy" onError={() => setSource(FALLBACK)} />;
}

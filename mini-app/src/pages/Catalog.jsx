import { useState } from 'react';
import ProductCard from '../components/ProductCard.jsx';
import SearchBar from '../components/SearchBar.jsx';
import Empty from '../components/Empty.jsx';
import { haptic } from '../telegram.js';
import { categoryEmoji, matchesQuery } from '../format.js';

export default function Catalog({ products, categories, initialCategory = 'Barchasi', onOpenProduct }) {
  const [active, setActive] = useState(categories.includes(initialCategory) ? initialCategory : 'Barchasi');
  const [query, setQuery] = useState('');

  const filtered = products.filter(
    (item) => (active === 'Barchasi' || item.category === active) && matchesQuery(item, query),
  );

  return (
    <div className="screen">
      <div className="page-head">
        <div className="page-head__row">
          <h1 className="page-title">Menyu</h1>
          <span className="page-sub">{filtered.length} ta mahsulot</span>
        </div>
        <div style={{ marginTop: 8 }}>
          <SearchBar value={query} onChange={setQuery} placeholder="Menyudan qidirish" flat />
        </div>
        <div className="chips" role="tablist" aria-label="Kategoriyalar">
          {categories.map((category) => (
            <button
              key={category}
              role="tab"
              aria-selected={active === category}
              className={`chip ${active === category ? 'chip--on' : ''}`}
              onClick={() => {
                haptic('light');
                setActive(category);
              }}
            >
              <span aria-hidden="true">{categoryEmoji(category)}</span>
              {category}
            </button>
          ))}
        </div>
      </div>

      {filtered.length === 0 ? (
        <Empty icon="🔍" title="Hech narsa topilmadi" text="Boshqa kategoriya yoki so‘zni tanlab ko‘ring." />
      ) : (
        <div className="grid">
          {filtered.map((product) => (
            <ProductCard key={product.id} product={product} onOpen={onOpenProduct} />
          ))}
        </div>
      )}
    </div>
  );
}

import { useCallback, useEffect, useState } from 'react';
import api from '../api.js';
import { money } from '../format.js';
import Modal from '../components/Modal.jsx';
import Empty from '../components/Empty.jsx';

const EMPTY_FORM = {
  name: '',
  description: '',
  ingredients: '',
  imageUrl: '',
  oldPrice: '',
  newPrice: '',
  category: 'Klassik',
  isActive: true,
};

export default function Products({ onRefreshStats }) {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');
  const [previewOk, setPreviewOk] = useState(true);

  const load = useCallback(async () => {
    try {
      setProducts(await api.getProducts());
      setError('');
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const categories = [...new Set(products.map((product) => product.category))];

  const openForm = (product = null) => {
    setEditing(product);
    setForm(
      product
        ? {
            name: product.name,
            description: product.description,
            ingredients: (product.ingredients || []).join(', '),
            imageUrl: product.imageUrl,
            oldPrice: String(product.oldPrice || ''),
            newPrice: String(product.newPrice),
            category: product.category,
            isActive: product.isActive,
          }
        : EMPTY_FORM,
    );
    setFormError('');
    setPreviewOk(true);
    setOpen(true);
  };

  const closeForm = useCallback(() => setOpen(false), []);

  const change = (key, value) => {
    if (key === 'imageUrl') setPreviewOk(true);
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const save = async (event) => {
    event?.preventDefault();
    setFormError('');

    if (!form.name.trim()) return setFormError('Mahsulot nomini kiriting');
    if (!/^https?:\/\//i.test(form.imageUrl.trim())) return setFormError('Rasm URL https:// bilan boshlanishi kerak');
    if (!(Number(form.newPrice) > 0)) return setFormError('Yangi narxni kiriting');
    if (form.oldPrice && Number(form.oldPrice) < Number(form.newPrice)) {
      return setFormError('Eski narx yangi narxdan kichik bo‘lmasligi kerak');
    }

    const payload = {
      ...form,
      oldPrice: Number(form.oldPrice) || Number(form.newPrice),
      newPrice: Number(form.newPrice),
    };

    setSaving(true);
    try {
      if (editing) await api.updateProduct(editing.id, payload);
      else await api.createProduct(payload);
      setOpen(false);
      await load();
      onRefreshStats();
    } catch (requestError) {
      setFormError(requestError.message);
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (product) => {
    try {
      await api.updateProduct(product.id, { ...product, isActive: !product.isActive });
      await load();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  const remove = async (product) => {
    if (!window.confirm(`«${product.name}» butunlay o‘chirilsinmi?\n\nVaqtincha yashirish uchun «Holat» tugmasidan foydalaning.`)) return;
    try {
      await api.deleteProduct(product.id);
      await load();
      onRefreshStats();
    } catch (requestError) {
      setError(requestError.message);
    }
  };

  return (
    <>
      <div className="topbar">
        <div>
          <h1>Mahsulotlar</h1>
          <p>Jami {products.length} ta mahsulot</p>
        </div>
        <div className="topbar__actions">
          <button className="btn btn--ghost" onClick={load}>
            🔄 Yangilash
          </button>
          <button className="btn btn--accent" onClick={() => openForm()}>
            ＋ Yangi mahsulot
          </button>
        </div>
      </div>

      {error && <div className="error-box">{error}</div>}

      <div className="table-wrap">
        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Yuklanmoqda...
          </div>
        ) : products.length === 0 ? (
          <Empty icon="🍕" title="Mahsulotlar yo‘q" text="«Yangi mahsulot» tugmasi orqali qo‘shing." />
        ) : (
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Mahsulot</th>
                  <th>Kategoriya</th>
                  <th>Eski narx</th>
                  <th>Yangi narx</th>
                  <th>Holat</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id} className={product.isActive ? '' : 'row--muted'}>
                    <td className="cell-muted">#{product.id}</td>
                    <td>
                      <div className="prod-cell">
                        <img
                          className="thumb"
                          src={product.imageUrl}
                          alt=""
                          onError={(event) => {
                            event.currentTarget.style.visibility = 'hidden';
                          }}
                        />
                        <div>
                          <div className="cell-strong">{product.name}</div>
                          <div className="cell-muted cell-desc">{product.description}</div>
                        </div>
                      </div>
                    </td>
                    <td className="cell-nowrap">{product.category}</td>
                    <td className="cell-muted cell-nowrap price-old">
                      {product.oldPrice > product.newPrice ? money(product.oldPrice) : '—'}
                    </td>
                    <td className="cell-strong cell-nowrap price-new">{money(product.newPrice)}</td>
                    <td>
                      <button
                        className={`badge badge--btn ${product.isActive ? 'badge--ok' : 'badge--off'}`}
                        onClick={() => toggleActive(product)}
                        title="Bosib o‘zgartiring"
                      >
                        {product.isActive ? 'Faol' : 'Yashirilgan'}
                      </button>
                    </td>
                    <td>
                      <div className="cell-actions">
                        <button className="icon-btn" title="Tahrirlash" aria-label="Tahrirlash" onClick={() => openForm(product)}>
                          ✏️
                        </button>
                        <button
                          className="icon-btn icon-btn--danger"
                          title="O‘chirish"
                          aria-label="O‘chirish"
                          onClick={() => remove(product)}
                        >
                          🗑
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {open && (
        <Modal
          title={editing ? `Tahrirlash — ${editing.name}` : 'Yangi mahsulot'}
          onClose={closeForm}
          footer={
            <>
              <button className="btn btn--ghost btn--full" onClick={closeForm}>
                Bekor qilish
              </button>
              <button className="btn btn--primary btn--full" onClick={save} disabled={saving}>
                {saving ? 'Saqlanmoqda...' : 'Saqlash'}
              </button>
            </>
          }
        >
          <form onSubmit={save}>
            {formError && <div className="error-box">{formError}</div>}

            <div className="field">
              <label htmlFor="p-name">Nomi *</label>
              <input id="p-name" value={form.name} onChange={(e) => change('name', e.target.value)} placeholder="Margarita" />
            </div>

            <div className="field">
              <label htmlFor="p-desc">Ta’rifi</label>
              <textarea
                id="p-desc"
                rows={2}
                value={form.description}
                onChange={(e) => change('description', e.target.value)}
                placeholder="Qisqa va ishtaha ochuvchi ta’rif"
              />
            </div>

            <div className="field">
              <label htmlFor="p-ing">Tarkibi</label>
              <input
                id="p-ing"
                value={form.ingredients}
                onChange={(e) => change('ingredients', e.target.value)}
                placeholder="Pomidor sousi, Mozzarella, Rayhon"
              />
              <div className="field__hint">Vergul (,) bilan ajrating</div>
            </div>

            <div className="field">
              <label htmlFor="p-img">Rasm URL *</label>
              <input
                id="p-img"
                value={form.imageUrl}
                onChange={(e) => change('imageUrl', e.target.value)}
                placeholder="https://images.unsplash.com/photo-..."
              />
              {form.imageUrl && previewOk && (
                <img className="preview" src={form.imageUrl} alt="" onError={() => setPreviewOk(false)} />
              )}
              {form.imageUrl && !previewOk && <div className="field__hint field__hint--bad">Rasm ochilmadi — URL ni tekshiring</div>}
            </div>

            <div className="field field--row">
              <div>
                <label htmlFor="p-old">Eski narx (so‘m)</label>
                <input id="p-old" type="number" min="0" value={form.oldPrice} onChange={(e) => change('oldPrice', e.target.value)} placeholder="75000" />
              </div>
              <div>
                <label htmlFor="p-new">Yangi narx (so‘m) *</label>
                <input id="p-new" type="number" min="0" value={form.newPrice} onChange={(e) => change('newPrice', e.target.value)} placeholder="59000" />
              </div>
            </div>

            <div className="field field--row">
              <div>
                <label htmlFor="p-cat">Kategoriya</label>
                <input
                  id="p-cat"
                  list="categories"
                  value={form.category}
                  onChange={(e) => change('category', e.target.value)}
                  placeholder="Klassik"
                />
                <datalist id="categories">
                  {categories.map((category) => (
                    <option key={category} value={category} />
                  ))}
                </datalist>
              </div>
              <div>
                <label htmlFor="p-active">Holati</label>
                <select id="p-active" value={form.isActive ? '1' : '0'} onChange={(e) => change('isActive', e.target.value === '1')}>
                  <option value="1">Faol (Mini App’da ko‘rinadi)</option>
                  <option value="0">Yashirilgan</option>
                </select>
              </div>
            </div>
            <button type="submit" hidden />
          </form>
        </Modal>
      )}
    </>
  );
}

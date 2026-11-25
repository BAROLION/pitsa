import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { storage } from './format.js';

const CartContext = createContext(null);
const STORAGE_KEY = 'pizza_cart_v2';

export function CartProvider({ children }) {
  const [items, setItems] = useState(() => storage.get(STORAGE_KEY, []));

  useEffect(() => storage.set(STORAGE_KEY, items), [items]);

  const add = useCallback((product, quantity = 1) => {
    setItems((prev) => {
      const found = prev.find((item) => item.id === product.id);
      if (found) {
        return prev.map((item) =>
          item.id === product.id ? { ...item, quantity: Math.min(50, item.quantity + quantity) } : item,
        );
      }
      return [
        ...prev,
        { id: product.id, name: product.name, imageUrl: product.imageUrl, price: product.newPrice, quantity },
      ];
    });
  }, []);

  const setQuantity = useCallback((id, quantity) => {
    setItems((prev) =>
      quantity <= 0
        ? prev.filter((item) => item.id !== id)
        : prev.map((item) => (item.id === id ? { ...item, quantity: Math.min(50, quantity) } : item)),
    );
  }, []);

  const remove = useCallback((id) => setItems((prev) => prev.filter((item) => item.id !== id)), []);
  const clear = useCallback(() => setItems([]), []);

  /** Narx/nom o'zgargan yoki o'chirilgan mahsulotlarni savatchada yangilaydi. */
  const sync = useCallback((products) => {
    const map = new Map(products.map((product) => [product.id, product]));
    setItems((prev) =>
      prev
        .filter((item) => map.has(item.id))
        .map((item) => {
          const product = map.get(item.id);
          return { ...item, name: product.name, imageUrl: product.imageUrl, price: product.newPrice };
        }),
    );
  }, []);

  const value = useMemo(() => {
    const count = items.reduce((sum, item) => sum + item.quantity, 0);
    const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const quantityOf = (id) => items.find((item) => item.id === id)?.quantity || 0;
    return { items, count, total, quantityOf, add, setQuantity, remove, clear, sync };
  }, [items, add, setQuantity, remove, clear, sync]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart faqat CartProvider ichida ishlaydi');
  return context;
}

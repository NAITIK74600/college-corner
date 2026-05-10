'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import type { CartItem } from '@/types';

interface CartContextValue {
  cart:         CartItem[];
  cartOpen:     boolean;
  totalItems:   number;
  totalAmount:  number;
  addToCart:    (item: Omit<CartItem, 'qty'>) => void;
  removeFromCart: (id: string) => void;
  updateQty:    (id: string, qty: number) => void;
  clearCart:    () => void;
  toggleCart:   () => void;
  setCartOpen:  (open: boolean) => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cart, setCart]         = useState<CartItem[]>([]);
  const [cartOpen, setCartOpen] = useState(false);

  const addToCart = useCallback((item: Omit<CartItem, 'qty'>) => {
    setCart((prev) => {
      const existing = prev.find((c) => c.id === item.id);
      if (existing) {
        return prev.map((c) =>
          c.id === item.id
            ? { ...c, qty: Math.min(c.qty + 1, c.stock) }
            : c
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((id: string) => {
    setCart((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const updateQty = useCallback((id: string, qty: number) => {
    setCart((prev) =>
      prev.map((c) =>
        c.id === id ? { ...c, qty: Math.max(1, Math.min(qty, c.stock)) } : c
      ).filter((c) => c.qty > 0)
    );
  }, []);

  const clearCart = useCallback(() => setCart([]), []);

  const toggleCart = useCallback(() => setCartOpen((o) => !o), []);

  const totalItems  = cart.reduce((s, c) => s + c.qty, 0);
  const totalAmount = cart.reduce((s, c) => s + parseFloat(c.price) * c.qty, 0);

  return (
    <CartContext.Provider
      value={{ cart, cartOpen, totalItems, totalAmount, addToCart, removeFromCart, updateQty, clearCart, toggleCart, setCartOpen }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}

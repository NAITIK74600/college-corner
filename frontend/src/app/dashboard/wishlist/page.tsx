'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { wishlistApi } from '@/lib/api';

const E = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

const containerV = { hidden: {}, visible: { transition: { staggerChildren: 0.06 } } };
const cardV = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: E } },
  exit:    { opacity: 0, scale: 0.95, transition: { duration: 0.22 } },
};

const PRODUCT_ICONS: Record<string, string> = {
  Stationery:     '📎',
  Tech:           '⚡',
  'Lab Supplies': '🔬',
  Snacks:         '🍫',
  'Print Media':  '📄',
};

function StarRow({ value }: { value: number }) {
  const rounded = Math.round(value * 2) / 2;
  return (
    <div style={{ display: 'flex', gap: '2px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n} style={{ fontSize: '0.8rem', color: n <= rounded ? '#f59e0b' : '#e5e7eb', lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

export default function WishlistPage() {
  const router     = useRouter();
  const { user, loading } = useAuth();
  const { addToCart } = useCart();

  const [items,    setItems]    = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);
  const [toast,    setToast]    = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const res = await wishlistApi.getAll();
      setItems(res.data ?? []);
    } catch {
      setItems([]);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleRemove = async (productId: string) => {
    setItems(prev => prev.filter(p => p.id !== productId));
    try {
      await wishlistApi.remove(productId);
      showToast('Removed from wishlist');
    } catch {
      load();
    }
  };

  const handleAddToCart = (item: any) => {
    addToCart({ id: item.id, name: item.name, price: item.price, image_url: item.image_url ?? null, stock: item.stock ?? 99 });
    showToast(`${item.name} added to cart 🛒`);
  };

  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, ease: E }}
          style={{ marginBottom: '2rem' }}
        >
          <Link href="/dashboard" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.3rem', marginBottom: '0.75rem' }}>
            ← Dashboard
          </Link>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.5rem,4vw,2rem)', fontWeight: 900, margin: 0 }}>
            💙 Wishlist
          </h1>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginTop: '0.3rem' }}>
            {items.length} saved {items.length === 1 ? 'item' : 'items'}
          </p>
        </motion.div>

        {/* Skeleton */}
        {fetching && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1.25rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ height: 220, borderRadius: 'var(--r-xl)', background: 'var(--surface-2)', animation: 'pulse 1.5s ease-in-out infinite' }} />
            ))}
          </div>
        )}

        {/* Empty */}
        {!fetching && items.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--surface)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}
          >
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>💙</div>
            <h3 style={{ fontFamily: 'var(--font-heading)', fontWeight: 800, marginBottom: '0.5rem' }}>Your wishlist is empty</h3>
            <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Browse the store and save items for later.</p>
            <Link href="/store" style={{ display: 'inline-block', padding: '0.65rem 1.5rem', background: 'var(--gradient-brand)', color: '#fff', borderRadius: 'var(--r-pill)', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
              Browse Store
            </Link>
          </motion.div>
        )}

        {/* Grid */}
        {!fetching && items.length > 0 && (
          <motion.div
            variants={containerV} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(240px,1fr))', gap: '1.25rem' }}
          >
            <AnimatePresence>
              {items.map(item => (
                <motion.div key={item.id} variants={cardV} exit={cardV.exit} layout
                  style={{
                    background: 'var(--surface)', border: '1px solid var(--border)',
                    borderRadius: 'var(--r-xl)', overflow: 'hidden',
                    display: 'flex', flexDirection: 'column',
                    boxShadow: 'var(--shadow-sm)',
                  }}
                >
                  {/* Product icon */}
                  <Link href={`/store/${item.id}`} style={{ textDecoration: 'none' }}>
                    <div style={{
                      height: 110, display: 'flex', alignItems: 'center', justifyContent: 'center',
                      background: 'var(--surface-2)', fontSize: '3rem',
                    }}>
                      {item.image_url
                        ? <img src={item.image_url} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                        : PRODUCT_ICONS[item.category] ?? '📦'}
                    </div>
                  </Link>

                  <div style={{ padding: '1rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                    <span style={{ fontSize: '0.73rem', fontWeight: 700, color: 'var(--indigo)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                      {item.category}
                    </span>
                    <Link href={`/store/${item.id}`} style={{ textDecoration: 'none', color: 'var(--text-pri)', fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.3 }}>
                      {item.name}
                    </Link>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      {item.avg_rating && <StarRow value={item.avg_rating} />}
                      <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>{item.avg_rating ? item.avg_rating.toFixed(1) : 'No reviews'}</span>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                      <span style={{ fontFamily: 'var(--font-heading)', fontWeight: 900, fontSize: '1.1rem', color: 'var(--indigo)' }}>
                        ₹{parseFloat(item.price).toFixed(0)}
                      </span>
                      <span style={{ fontSize: '0.75rem', color: item.stock > 0 ? 'var(--emerald)' : 'var(--rose)', fontWeight: 700 }}>
                        {item.stock > 0 ? `${item.stock} left` : 'Out of stock'}
                      </span>
                    </div>

                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem' }}>
                      <button
                        onClick={() => handleAddToCart(item)}
                        disabled={item.stock === 0}
                        style={{
                          flex: 1, padding: '0.55rem', borderRadius: 'var(--r-md)',
                          background: item.stock > 0 ? 'var(--gradient-brand)' : 'var(--surface-3)',
                          color: item.stock > 0 ? '#fff' : 'var(--text-muted)',
                          border: 'none', cursor: item.stock > 0 ? 'pointer' : 'not-allowed',
                          fontWeight: 700, fontSize: '0.82rem',
                        }}
                      >
                        {item.stock > 0 ? '🛒 Add to Cart' : 'Out of Stock'}
                      </button>
                      <button
                        onClick={() => handleRemove(item.id)}
                        title="Remove from wishlist"
                        style={{
                          padding: '0.55rem 0.75rem', borderRadius: 'var(--r-md)',
                          background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)',
                          color: '#ef4444', cursor: 'pointer', fontSize: '1rem', lineHeight: 1,
                        }}
                      >
                        🗑
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Toast */}
        <AnimatePresence>
          {toast && (
            <motion.div
              key="toast"
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 16, scale: 0.95 }}
              transition={{ duration: 0.25, ease: E }}
              style={{
                position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
                padding: '0.65rem 1.4rem', borderRadius: 'var(--r-pill)',
                background: toast.ok ? 'rgba(5,150,105,0.95)' : 'rgba(220,38,38,0.95)',
                color: '#fff', fontWeight: 700, fontSize: '0.88rem',
                boxShadow: 'var(--shadow-lg)', zIndex: 9999, whiteSpace: 'nowrap',
              }}
            >
              {toast.msg}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

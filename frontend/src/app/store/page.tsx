'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { productsApi, wishlistApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import type { Product, ProductListResponse } from '@/types';

// ─── Category metadata ────────────────────────────────────────────────────────
const CATEGORIES = ['All', 'Stationery', 'Tech', 'Lab Supplies', 'Snacks', 'Print Media'];

const CATEGORY_ICONS: Record<string, string> = {
  All:             '🏬',
  Stationery:      '✏️',
  Tech:            '💻',
  'Lab Supplies':  '🔬',
  Snacks:          '🍫',
  'Print Media':   '🖨️',
};

const PRODUCT_ICONS: Record<string, string> = {
  Stationery:      '📎',
  Tech:            '⚡',
  'Lab Supplies':  '🔬',
  Snacks:          '🍫',
  'Print Media':   '📄',
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};
const cardVariant = {
  hidden:   { opacity: 0, y: 22, scale: 0.97 },
  visible:  { opacity: 1, y: 0,  scale: 1, transition: { duration: 0.4, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};

const SP = { type: 'spring' as const, stiffness: 380, damping: 26 };

export default function StorePage() {
  const router = useRouter();
  const { user } = useAuth();
  const { cart, cartOpen, totalItems, totalAmount, addToCart, removeFromCart, updateQty, setCartOpen } = useCart();

  const [activeCategory, setActiveCategory] = useState('All');
  const [search,         setSearch]         = useState('');
  const [debouncedQ,     setDebouncedQ]     = useState('');
  const [products,       setProducts]       = useState<Product[]>([]);
  const [loading,        setLoading]        = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Advanced filters ────────────────────────────────────────────────────
  const [filterOpen,  setFilterOpen]  = useState(false);
  const [sort,        setSort]        = useState('default');
  const [minPrice,    setMinPrice]    = useState('');
  const [maxPrice,    setMaxPrice]    = useState('');
  const [inStock,     setInStock]     = useState(false);

  // ── Wishlist ─────────────────────────────────────────────────────────────
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!user) return;
    wishlistApi.getIds().then(r => setWishlistIds(new Set(r.data ?? []))).catch(() => {});
  }, [user]);

  const toggleWishlist = async (productId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!user) { router.push('/login'); return; }
    const inWishlist = wishlistIds.has(productId);
    setWishlistIds(prev => {
      const next = new Set(prev);
      inWishlist ? next.delete(productId) : next.add(productId);
      return next;
    });
    try {
      if (inWishlist) await wishlistApi.remove(productId);
      else            await wishlistApi.add(productId);
    } catch {
      // Revert on error
      setWishlistIds(prev => {
        const next = new Set(prev);
        inWishlist ? next.add(productId) : next.delete(productId);
        return next;
      });
    }
  };

  const activeFilterCount = [sort !== 'default', minPrice !== '', maxPrice !== '', inStock].filter(Boolean).length;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setDebouncedQ(search), 320);
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params: any = { category: activeCategory, q: debouncedQ };
      if (sort !== 'default') params.sort = sort;
      if (minPrice !== '')    params.minPrice = minPrice;
      if (maxPrice !== '')    params.maxPrice = maxPrice;
      if (inStock)            params.inStock = 'true';
      const res = await productsApi.list(params) as ProductListResponse;
      setProducts(res.data ?? []);
    } catch {
      setProducts([]);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, debouncedQ, sort, minPrice, maxPrice, inStock]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleAddToCart = (product: Product) => {
    if (product.stock === 0) return;
    addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock });
  };

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3rem)' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '0.4rem' }}>CAMPUS STORE</p>
        <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>Browse Products</h1>
            <p style={{ color: 'var(--text-sec)', marginTop: '0.3rem' }}>Delivered to your block in minutes.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', fontSize: '1rem', pointerEvents: 'none' }}>🔍</span>
              <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search products…"
                style={{ padding: '0.62rem 1.1rem 0.62rem 2.6rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.9rem', outline: 'none', width: '220px', fontFamily: 'var(--font-body)' }}
              />
            </div>
            {/* Filter toggle */}
            <motion.button onClick={() => setFilterOpen(v => !v)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={SP}
              style={{ position: 'relative', padding: '0.62rem 1.1rem', borderRadius: 'var(--r-pill)', border: activeFilterCount > 0 ? '1.5px solid var(--indigo)' : '1.5px solid var(--border-strong)', background: activeFilterCount > 0 ? 'rgba(79,70,229,0.08)' : 'var(--surface)', color: activeFilterCount > 0 ? 'var(--indigo)' : 'var(--text-pri)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-body)', display: 'flex', alignItems: 'center', gap: '6px' }}>
              ⚙ Filters
              {activeFilterCount > 0 && <span style={{ background: 'var(--indigo)', color: '#fff', borderRadius: '50%', width: 18, height: 18, fontSize: '0.7rem', display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900 }}>{activeFilterCount}</span>}
            </motion.button>
            {/* Wishlist shortcut */}
            {user && (
              <Link href="/dashboard/wishlist"
                style={{ padding: '0.62rem 1.1rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '6px' }}>
                💙 Saved{wishlistIds.size > 0 ? ` (${wishlistIds.size})` : ''}
              </Link>
            )}
            <motion.button onClick={() => setCartOpen(true)} whileHover={{ scale: 1.06 }} whileTap={{ scale: 0.95 }} transition={SP}
              style={{ position: 'relative', padding: '0.62rem 1.2rem', borderRadius: 'var(--r-pill)', background: totalItems > 0 ? 'var(--gradient-brand)' : 'var(--surface)', border: '1.5px solid var(--border-strong)', color: totalItems > 0 ? '#fff' : 'var(--text-pri)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px', fontFamily: 'var(--font-body)', boxShadow: totalItems > 0 ? 'var(--shadow-brand)' : 'none' }}
            >
              🛒 Cart
              {totalItems > 0 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} transition={SP}
                  style={{ background: '#fff', color: 'var(--indigo)', borderRadius: '50%', width: 20, height: 20, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.72rem', fontWeight: 900 }}>
                  {totalItems}
                </motion.span>
              )}
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Advanced filter panel */}
      <AnimatePresence>
        {filterOpen && (
          <motion.div
            initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.28, ease: [0.25, 0.1, 0.25, 1] }}
            style={{ overflow: 'hidden', marginBottom: '1.5rem' }}
          >
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', padding: '1.1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', alignItems: 'flex-end' }}>
              {/* Sort */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Sort By</label>
                <select value={sort} onChange={e => setSort(e.target.value)}
                  style={{ padding: '0.5rem 0.8rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.88rem', fontFamily: 'var(--font-body)', cursor: 'pointer' }}>
                  <option value="default">Default</option>
                  <option value="price_asc">Price: Low → High</option>
                  <option value="price_desc">Price: High → Low</option>
                  <option value="rating">Top Rated</option>
                  <option value="newest">Newest First</option>
                </select>
              </div>
              {/* Price range */}
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Min Price (₹)</label>
                <input type="number" min={0} value={minPrice} onChange={e => setMinPrice(e.target.value)} placeholder="0"
                  style={{ width: 90, padding: '0.5rem 0.7rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.35rem' }}>Max Price (₹)</label>
                <input type="number" min={0} value={maxPrice} onChange={e => setMaxPrice(e.target.value)} placeholder="any"
                  style={{ width: 90, padding: '0.5rem 0.7rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.88rem', fontFamily: 'var(--font-body)' }} />
              </div>
              {/* In stock */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', paddingBottom: '0.1rem' }}>
                <input type="checkbox" id="inStock" checked={inStock} onChange={e => setInStock(e.target.checked)}
                  style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--indigo)' }} />
                <label htmlFor="inStock" style={{ fontSize: '0.88rem', fontWeight: 700, cursor: 'pointer' }}>In Stock Only</label>
              </div>
              {/* Reset */}
              {activeFilterCount > 0 && (
                <button onClick={() => { setSort('default'); setMinPrice(''); setMaxPrice(''); setInStock(false); }}
                  style={{ padding: '0.5rem 1rem', borderRadius: 'var(--r-pill)', border: '1px solid var(--rose)', background: 'rgba(239,68,68,0.07)', color: 'var(--rose)', fontWeight: 700, fontSize: '0.82rem', cursor: 'pointer' }}>
                  ✕ Reset
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Category pills */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.45 }}
        style={{ display: 'flex', gap: '0.55rem', flexWrap: 'wrap', marginBottom: '2.5rem' }}>
        {CATEGORIES.map(cat => (
          <motion.button key={cat} onClick={() => setActiveCategory(cat)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={SP}
            style={{ padding: '0.42rem 1.05rem', borderRadius: 'var(--r-pill)', border: activeCategory === cat ? '1.5px solid transparent' : '1.5px solid var(--border-strong)', background: activeCategory === cat ? 'var(--gradient-brand)' : 'var(--surface)', color: activeCategory === cat ? '#fff' : 'var(--text-sec)', fontWeight: activeCategory === cat ? 700 : 600, fontSize: '0.85rem', cursor: 'pointer', boxShadow: activeCategory === cat ? 'var(--shadow-brand)' : 'none', fontFamily: 'var(--font-body)' }}>
            {CATEGORY_ICONS[cat]} {cat}
          </motion.button>
        ))}
      </motion.div>

      {/* Product grid */}
      <AnimatePresence mode="wait">
        {loading ? (
          <motion.div key="skeleton" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} style={{ borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden' }}>
                <div className="skeleton" style={{ width: '100%', aspectRatio: '4/3', borderRadius: 0 }} />
                <div style={{ padding: '1.1rem' }}>
                  <div className="skeleton" style={{ width: '65%', height: '0.85rem', borderRadius: 4, marginBottom: '0.55rem' }} />
                  <div className="skeleton" style={{ width: '40%', height: '0.75rem', borderRadius: 4, marginBottom: '1rem' }} />
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <div className="skeleton" style={{ width: '30%', height: '1.1rem', borderRadius: 4 }} />
                    <div className="skeleton" style={{ width: '28%', height: '2rem', borderRadius: 'var(--r-pill)' }} />
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        ) : products.length === 0 ? (
          <motion.div key="empty" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
            <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
            <p style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-pri)', marginBottom: '0.4rem' }}>No products found</p>
            <p style={{ fontSize: '0.9rem' }}>Try a different category or search term.</p>
          </motion.div>
        ) : (
          <motion.div key={`${activeCategory}-${debouncedQ}`} variants={containerVariants} initial="hidden" animate="visible"
            style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '1.25rem' }}>
            {products.map(product => {
              const inCart = cart.find(ci => ci.id === product.id);
              return (
                <motion.div key={product.id} variants={cardVariant} whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }} transition={SP}
                  style={{ borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                  <Link href={`/store/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                  <div style={{ width: '100%', aspectRatio: '4/3', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '3.5rem', borderBottom: '1px solid var(--border)', position: 'relative', cursor: 'pointer', overflow: 'hidden' }}>
                    {product.image_url ? (
                      <img
                        src={product.image_url.startsWith('http') ? product.image_url : `http://localhost:5000${product.image_url}`}
                        alt={product.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'transform 0.3s ease' }}
                        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.05)')}
                        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
                      />
                    ) : (
                      <span style={{ fontSize: '3.5rem' }}>{PRODUCT_ICONS[product.category] ?? '📦'}</span>
                    )}
                    <button
                      onClick={(e) => toggleWishlist(product.id, e)}
                      style={{ position: 'absolute', top: 8, left: 8, width: 30, height: 30, borderRadius: '50%', border: 'none', background: 'rgba(255,255,255,0.92)', backdropFilter: 'blur(4px)', cursor: 'pointer', fontSize: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 2px 8px rgba(0,0,0,0.12)', transition: 'transform 0.15s ease' }}
                      title={wishlistIds.has(product.id) ? 'Remove from wishlist' : 'Save to wishlist'}
                    >
                      {wishlistIds.has(product.id) ? '💙' : '🤍'}
                    </button>                    {product.stock <= 10 && product.stock > 0 && (
                      <span style={{ position: 'absolute', top: 8, right: 8, background: 'rgba(239,68,68,0.9)', color: '#fff', fontSize: '0.68rem', fontWeight: 800, padding: '2px 8px', borderRadius: 'var(--r-pill)' }}>Only {product.stock} left</span>
                    )}
                    {product.stock === 0 && (
                      <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.05em' }}>OUT OF STOCK</span>
                      </div>
                    )}
                  </div>
                  </Link>
                  <div style={{ padding: '1rem 1.1rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                    <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--indigo)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.3rem' }}>{product.category}</p>
                    <Link href={`/store/${product.id}`} style={{ textDecoration: 'none' }}><p style={{ fontSize: '0.95rem', fontWeight: 700, color: 'var(--text-pri)', lineHeight: 1.35, marginBottom: '0.3rem', flex: 1 }}>{product.name}</p></Link>
                    {product.description && (
                      <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '0.8rem', lineHeight: 1.4, overflow: 'hidden', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' as React.CSSProperties['WebkitBoxOrient'] }}>{product.description}</p>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                      <span style={{ fontSize: '1.1rem', fontWeight: 900, color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>₹{parseFloat(product.price).toFixed(0)}</span>
                      <motion.button onClick={() => handleAddToCart(product)} whileHover={product.stock > 0 ? { scale: 1.06 } : {}} whileTap={product.stock > 0 ? { scale: 0.95 } : {}} transition={SP} disabled={product.stock === 0}
                        style={{ padding: '0.42rem 1rem', borderRadius: 'var(--r-pill)', border: 'none', background: product.stock === 0 ? 'var(--surface-2)' : inCart ? 'var(--gradient-brand)' : 'linear-gradient(135deg, #FF7F7F 0%, #FFCBA4 100%)', color: product.stock === 0 ? 'var(--text-muted)' : '#fff', fontSize: '0.82rem', fontWeight: 700, cursor: product.stock === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: product.stock > 0 ? '0 3px 12px rgba(255,127,127,0.32)' : 'none' }}>
                        {product.stock === 0 ? 'Sold out' : inCart ? `In cart (${inCart.qty})` : 'Add to cart'}
                      </motion.button>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Cart drawer */}
      <AnimatePresence>
        {cartOpen && (
          <>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setCartOpen(false)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 40, backdropFilter: 'blur(3px)' }} />
            <motion.div initial={{ x: '100%' }} animate={{ x: 0 }} exit={{ x: '100%' }} transition={{ type: 'spring', stiffness: 320, damping: 34 }}
              style={{ position: 'fixed', top: 0, right: 0, bottom: 0, width: 'min(420px, 100vw)', background: 'var(--bg)', borderLeft: '1px solid var(--border)', boxShadow: '-8px 0 40px rgba(0,0,0,0.18)', zIndex: 50, display: 'flex', flexDirection: 'column', padding: '2rem 1.5rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h2 style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Your Cart 🛒</h2>
                <button onClick={() => setCartOpen(false)} style={{ background: 'none', border: 'none', fontSize: '1.4rem', cursor: 'pointer', color: 'var(--text-sec)' }}>✕</button>
              </div>
              {cart.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', gap: '0.75rem' }}>
                  <span style={{ fontSize: '3rem' }}>🛒</span>
                  <p style={{ fontWeight: 600 }}>Your cart is empty</p>
                </div>
              ) : (
                <>
                  <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {cart.map(ci => (
                      <div key={ci.id} style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', padding: '0.85rem', borderRadius: 'var(--r-md)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        <span style={{ fontSize: '1.8rem' }}>📦</span>
                        <div style={{ flex: 1 }}>
                          <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-pri)', lineHeight: 1.3 }}>{ci.name}</p>
                          <p style={{ fontSize: '0.8rem', color: 'var(--text-sec)' }}>₹{parseFloat(ci.price).toFixed(0)} × {ci.qty}</p>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateQty(ci.id, ci.qty - 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--border-strong)', background: 'var(--surface-2)', cursor: 'pointer', fontWeight: 900, color: 'var(--text-pri)' }}>−</motion.button>
                          <span style={{ fontWeight: 700, minWidth: 18, textAlign: 'center' }}>{ci.qty}</span>
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => updateQty(ci.id, ci.qty + 1)} style={{ width: 26, height: 26, borderRadius: '50%', border: '1.5px solid var(--border-strong)', background: 'var(--surface-2)', cursor: 'pointer', fontWeight: 900, color: 'var(--text-pri)' }}>+</motion.button>
                          <motion.button whileTap={{ scale: 0.9 }} onClick={() => removeFromCart(ci.id)} style={{ width: 26, height: 26, borderRadius: '50%', border: 'none', background: 'rgba(239,68,68,0.1)', cursor: 'pointer', color: '#ef4444', fontWeight: 900 }}>×</motion.button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1.25rem', marginTop: '1rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.1rem' }}>
                      <span style={{ fontWeight: 700, color: 'var(--text-sec)' }}>Subtotal</span>
                      <span style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>₹{totalAmount.toFixed(0)}</span>
                    </div>
                    <motion.button onClick={() => { setCartOpen(false); router.push('/checkout'); }} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={SP}
                      style={{ width: '100%', padding: '0.9rem', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 800, fontSize: '1rem', cursor: 'pointer', boxShadow: 'var(--shadow-brand)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em' }}>
                      Proceed to Checkout →
                    </motion.button>
                    <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.6rem' }}>Free delivery on orders above ₹499</p>
                  </div>
                </>
              )}
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}

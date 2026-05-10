'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { reviewsApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import type { ProductDetail, Review } from '@/types';

const PRODUCT_ICONS: Record<string, string> = {
  Stationery:     '📎',
  Tech:           '⚡',
  'Lab Supplies': '🔬',
  Snacks:         '🍫',
  'Print Media':  '📄',
};

const SP = { type: 'spring' as const, stiffness: 360, damping: 28 };

function StarRow({ value, interactive, onChange }: { value: number; interactive?: boolean; onChange?: (n: number) => void }) {
  const [hovered, setHovered] = useState(0);
  const display = interactive ? (hovered || value) : value;
  return (
    <div style={{ display: 'flex', gap: '3px' }}>
      {[1, 2, 3, 4, 5].map(n => (
        <span key={n}
          onClick={interactive && onChange ? () => onChange(n) : undefined}
          onMouseEnter={interactive ? () => setHovered(n) : undefined}
          onMouseLeave={interactive ? () => setHovered(0) : undefined}
          style={{ fontSize: interactive ? '1.5rem' : '0.95rem', cursor: interactive ? 'pointer' : 'default', color: n <= display ? '#f59e0b' : '#e5e7eb', lineHeight: 1, userSelect: 'none' }}>
          ★
        </span>
      ))}
    </div>
  );
}

export default function ProductDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user } = useAuth();
  const { cart, addToCart } = useCart();

  const [product,        setProduct]        = useState<ProductDetail | null>(null);
  const [reviews,        setReviews]        = useState<Review[]>([]);
  const [loading,        setLoading]        = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [notFound,       setNotFound]       = useState(false);

  // Review form state
  const [rating,       setRating]       = useState(5);
  const [comment,      setComment]      = useState('');
  const [submitting,   setSubmitting]   = useState(false);
  const [submitError,  setSubmitError]  = useState('');
  const [submitted,    setSubmitted]    = useState(false);

  const loadProduct = useCallback(async () => {
    try {
      const res = await reviewsApi.getDetail(params.id);
      setProduct(res.data);
    } catch (err: any) {
      if (err?.status === 404) setNotFound(true);
    } finally {
      setLoading(false);
    }
  }, [params.id]);

  const loadReviews = useCallback(async () => {
    setReviewsLoading(true);
    try {
      const res = await reviewsApi.list(params.id);
      setReviews(res.data ?? []);
      // Check if current user already left a review
      if (user) {
        const mine = res.data?.find(r => r.user_id === user.id);
        if (mine) { setSubmitted(true); setRating(mine.rating); setComment(mine.comment ?? ''); }
      }
    } catch {
      setReviews([]);
    } finally {
      setReviewsLoading(false);
    }
  }, [params.id, user]);

  useEffect(() => { loadProduct(); }, [loadProduct]);
  useEffect(() => { loadReviews(); }, [loadReviews]);

  const handleAddToCart = () => {
    if (!product || product.stock === 0) return;
    addToCart({ id: product.id, name: product.name, price: product.price, image_url: product.image_url, stock: product.stock });
  };

  const handleSubmitReview = async () => {
    if (rating < 1 || rating > 5) return;
    setSubmitting(true);
    setSubmitError('');
    try {
      await reviewsApi.add(params.id, rating, comment);
      setSubmitted(true);
      await loadReviews();
      // Refresh product to update avg_rating
      await loadProduct();
    } catch (err: any) {
      setSubmitError(err?.message ?? 'Failed to submit review.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteReview = async (reviewId: string) => {
    try {
      await reviewsApi.remove(params.id, reviewId);
      setSubmitted(false);
      setComment('');
      setRating(5);
      await loadReviews();
      await loadProduct();
    } catch {
      // silent
    }
  };

  if (loading) return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)' }}>
      <div className="skeleton" style={{ width: 80, height: '0.75rem', borderRadius: 4, marginBottom: '1.5rem' }} />
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2.5rem' }}>
        <div className="skeleton" style={{ borderRadius: 'var(--r-lg)', aspectRatio: '1/1' }} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
          {[60, 90, 45, 30, 70].map((w, i) => <div key={i} className="skeleton" style={{ width: `${w}%`, height: '1rem', borderRadius: 4 }} />)}
        </div>
      </div>
    </div>
  );

  if (notFound) return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
      <h2 style={{ fontSize: '1.4rem', fontWeight: 800, marginBottom: '0.5rem' }}>Product not found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem' }}>This item may have been removed.</p>
      <button onClick={() => router.push('/store')} style={{ padding: '0.6rem 1.4rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)', color: '#fff', border: 'none', fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}>← Back to Store</button>
    </div>
  );

  if (!product) return null;

  const inCart = cart.find(ci => ci.id === product.id);
  const price = parseFloat(product.price).toFixed(0);

  const avgDisplay = product.avg_rating ? product.avg_rating.toFixed(1) : null;

  return (
    <div style={{ maxWidth: 860, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)' }}>

      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.75rem', fontSize: '0.82rem', color: 'var(--text-muted)' }}>
        <button onClick={() => router.push('/store')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--indigo)', fontWeight: 600, fontSize: '0.82rem', padding: 0, fontFamily: 'var(--font-body)' }}>Store</button>
        <span>›</span>
        <span style={{ color: 'var(--indigo)', fontWeight: 600 }}>{product.category}</span>
        <span>›</span>
        <span style={{ color: 'var(--text-pri)', fontWeight: 600 }}>{product.name}</span>
      </motion.div>

      {/* Product hero */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}
        style={{ display: 'grid', gridTemplateColumns: 'minmax(220px, 340px) 1fr', gap: '2.5rem', marginBottom: '3rem', alignItems: 'start' }}>

        {/* Thumbnail */}
        <div style={{ borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', border: '1px solid var(--border)', aspectRatio: '1/1', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '5rem', position: 'relative', overflow: 'hidden' }}>
          {PRODUCT_ICONS[product.category] ?? '📦'}
          {product.stock === 0 && (
            <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ color: '#fff', fontWeight: 800, fontSize: '0.9rem', letterSpacing: '0.06em' }}>OUT OF STOCK</span>
            </div>
          )}
        </div>

        {/* Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
          <p style={{ fontSize: '0.74rem', fontWeight: 700, color: 'var(--indigo)', letterSpacing: '0.1em', textTransform: 'uppercase' }}>{product.category}</p>

          <h1 style={{ fontSize: 'clamp(1.4rem, 2.5vw, 2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-pri)', lineHeight: 1.2 }}>{product.name}</h1>

          {/* Rating summary */}
          {product.review_count > 0 ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <StarRow value={Math.round(product.avg_rating ?? 0)} />
              <span style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-pri)' }}>{avgDisplay}</span>
              <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>({product.review_count} review{product.review_count !== 1 ? 's' : ''})</span>
            </div>
          ) : (
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>No reviews yet — be the first!</p>
          )}

          <p style={{ fontSize: '1.9rem', fontWeight: 900, color: 'var(--text-pri)', fontFamily: 'var(--font-heading)', marginTop: '0.3rem' }}>₹{price}</p>

          {product.description && (
            <p style={{ fontSize: '0.9rem', color: 'var(--text-sec)', lineHeight: 1.6, maxWidth: '460px' }}>{product.description}</p>
          )}

          <p style={{ fontSize: '0.82rem', color: product.stock > 10 ? 'var(--emerald)' : product.stock > 0 ? '#f59e0b' : 'var(--rose)', fontWeight: 600 }}>
            {product.stock === 0 ? 'Out of stock' : product.stock <= 10 ? `Only ${product.stock} left` : `${product.stock} in stock`}
          </p>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
            <motion.button onClick={handleAddToCart} whileHover={product.stock > 0 ? { scale: 1.04 } : {}} whileTap={product.stock > 0 ? { scale: 0.97 } : {}} transition={SP}
              disabled={product.stock === 0}
              style={{ padding: '0.7rem 2rem', borderRadius: 'var(--r-pill)', border: 'none', background: product.stock === 0 ? 'var(--surface-3)' : inCart ? 'var(--gradient-brand)' : 'linear-gradient(135deg, #FF7F7F 0%, #FFCBA4 100%)', color: product.stock === 0 ? 'var(--text-muted)' : '#fff', fontWeight: 700, fontSize: '0.95rem', cursor: product.stock === 0 ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)', boxShadow: product.stock > 0 ? '0 4px 16px rgba(255,127,127,0.35)' : 'none' }}>
              {product.stock === 0 ? 'Sold Out' : inCart ? `In Cart (${inCart.qty}) ✓` : '🛒 Add to Cart'}
            </motion.button>

            {inCart && (
              <motion.button initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={SP}
                onClick={() => router.push('/checkout')}
                style={{ padding: '0.7rem 2rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--indigo)', background: 'transparent', color: 'var(--indigo)', fontWeight: 700, fontSize: '0.95rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
                Checkout →
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>

      {/* Divider */}
      <div style={{ height: '1px', background: 'var(--border)', marginBottom: '2.5rem' }} />

      {/* Reviews section */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.45 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Reviews</h2>
          {product.review_count > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontWeight: 600 }}>{product.review_count} review{product.review_count !== 1 ? 's' : ''}</span>
          )}
        </div>

        {/* Write a review */}
        {user ? (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem', marginBottom: '2rem' }}>
            {submitted ? (
              <div>
                <p style={{ fontWeight: 700, color: 'var(--text-pri)', marginBottom: '0.5rem' }}>Your review</p>
                <StarRow value={rating} />
                {comment && <p style={{ fontSize: '0.88rem', color: 'var(--text-sec)', marginTop: '0.5rem', lineHeight: 1.5 }}>{comment}</p>}
                <button onClick={() => {
                  const mine = reviews.find(r => r.user_id === user.id);
                  if (mine) handleDeleteReview(mine.id);
                }} style={{ marginTop: '0.75rem', background: 'none', border: 'none', color: 'var(--rose)', fontSize: '0.8rem', cursor: 'pointer', fontWeight: 600, padding: 0 }}>
                  Delete review
                </button>
              </div>
            ) : (
              <div>
                <p style={{ fontWeight: 700, fontSize: '0.95rem', marginBottom: '0.85rem', color: 'var(--text-pri)' }}>Leave a review</p>
                <div style={{ marginBottom: '0.85rem' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '0.35rem' }}>Your rating</p>
                  <StarRow value={rating} interactive onChange={setRating} />
                </div>
                <textarea value={comment} onChange={e => setComment(e.target.value)} placeholder="Share your experience (optional)…" rows={3}
                  style={{ width: '100%', padding: '0.7rem 1rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.88rem', lineHeight: 1.5, resize: 'vertical', fontFamily: 'var(--font-body)', outline: 'none', boxSizing: 'border-box' }} />
                {submitError && <p style={{ color: 'var(--rose)', fontSize: '0.8rem', marginTop: '0.4rem' }}>{submitError}</p>}
                <motion.button onClick={handleSubmitReview} disabled={submitting} whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} transition={SP}
                  style={{ marginTop: '0.85rem', padding: '0.6rem 1.6rem', borderRadius: 'var(--r-pill)', border: 'none', background: submitting ? 'var(--surface-3)' : 'var(--gradient-brand)', color: submitting ? 'var(--text-muted)' : '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: submitting ? 'not-allowed' : 'pointer', fontFamily: 'var(--font-body)' }}>
                  {submitting ? 'Submitting…' : 'Submit Review'}
                </motion.button>
              </div>
            )}
          </div>
        ) : (
          <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.25rem 1.5rem', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '1rem', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <p style={{ color: 'var(--text-sec)', fontSize: '0.9rem' }}>Sign in to leave a review</p>
            <button onClick={() => router.push('/login')} style={{ padding: '0.5rem 1.2rem', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>Sign in</button>
          </div>
        )}

        {/* Review list */}
        {reviewsLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2].map(i => (
              <div key={i} style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', padding: '1.25rem' }}>
                <div className="skeleton" style={{ width: '40%', height: '0.8rem', borderRadius: 4, marginBottom: '0.5rem' }} />
                <div className="skeleton" style={{ width: '70%', height: '0.75rem', borderRadius: 4 }} />
              </div>
            ))}
          </div>
        ) : reviews.length === 0 ? (
          <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem 0' }}>No reviews yet.</p>
        ) : (
          <AnimatePresence>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {reviews.map((review, i) => (
                <motion.div key={review.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05, duration: 0.35 }}
                  style={{ borderRadius: 'var(--r-lg)', border: '1px solid var(--border)', padding: '1.25rem 1.4rem', background: 'var(--surface)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.45rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                      <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--gradient-brand)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 800, fontSize: '0.85rem' }}>
                        {review.user_name.charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-pri)' }}>{review.user_name}</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <StarRow value={review.rating} />
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>{new Date(review.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                    </div>
                  </div>
                  {review.comment && <p style={{ fontSize: '0.88rem', color: 'var(--text-sec)', lineHeight: 1.55, marginTop: '0.3rem' }}>{review.comment}</p>}
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}
      </motion.div>
    </div>
  );
}

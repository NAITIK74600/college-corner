'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { ordersApi } from '@/lib/api';
import type { Order, OrderListResponse } from '@/types';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  placed:     { label: 'Placed',     color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  processing: { label: 'Processing', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  dispatched: { label: 'Dispatched', color: '#3b82f6', bg: 'rgba(59,130,246,0.1)'  },
  delivered:  { label: 'Delivered',  color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  cancelled:  { label: 'Cancelled',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

const PAY_CONFIG: Record<string, { label: string; color: string }> = {
  pending:  { label: 'Pending',  color: '#f59e0b' },
  paid:     { label: 'Paid',     color: '#10b981' },
  failed:   { label: 'Failed',   color: '#ef4444' },
  refunded: { label: 'Refunded', color: '#6366f1' },
};

const containerVariants = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const rowVariant = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};

export default function OrdersPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [orders,    setOrders]    = useState<Order[]>([]);
  const [fetching,  setFetching]  = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const res = await ordersApi.list() as OrderListResponse;
      setOrders(res.orders ?? []);
    } catch {
      setOrders([]);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading || (!user && !loading)) return null;

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Link href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none', marginBottom: '0.5rem' }}>
            ← Dashboard
          </Link>
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-pri)', margin: 0 }}>
            Order History
          </h1>
        </div>
        {!fetching && orders.length > 0 && (
          <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
            {orders.length} order{orders.length !== 1 ? 's' : ''}
          </span>
        )}
      </motion.div>

      {/* Loading skeleton */}
      {fetching && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {[1,2,3].map(i => (
            <div key={i} className="skeleton" style={{ height: '72px', borderRadius: 'var(--r-lg)' }} />
          ))}
        </div>
      )}

      {/* Empty state */}
      {!fetching && orders.length === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}
          style={{ textAlign: 'center', padding: '4rem 2rem', background: 'var(--surface-2)', borderRadius: 'var(--r-xl)', border: '1px solid var(--border)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>📦</div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-pri)' }}>No orders yet</h3>
          <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>Head to the store to place your first order.</p>
          <Link href="/store"
            style={{ display: 'inline-block', padding: '0.65rem 1.75rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', textDecoration: 'none' }}>
            Browse Store
          </Link>
        </motion.div>
      )}

      {/* Orders list */}
      {!fetching && orders.length > 0 && (
        <motion.div variants={containerVariants} initial="hidden" animate="visible"
          style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
          {orders.map(order => {
            const s = STATUS_CONFIG[order.status] ?? STATUS_CONFIG.placed;
            const p = PAY_CONFIG[order.payment_status] ?? PAY_CONFIG.pending;
            const date = new Date(order.created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
            const itemCount = order.items?.length ?? 0;
            return (
              <motion.div key={order.id} variants={rowVariant}
                onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(79,70,229,0.10)' }}
                style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.1rem 1.4rem', cursor: 'pointer', display: 'grid', gridTemplateColumns: '1fr auto', gap: '0.75rem 1.5rem', alignItems: 'center', transition: 'box-shadow 0.18s, transform 0.18s' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', flexWrap: 'wrap' }}>
                  {/* Order number */}
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Order</p>
                    <p style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>#{order.sequence_number}</p>
                  </div>
                  {/* Date */}
                  <div style={{ height: 32, width: '1px', background: 'var(--border)' }} />
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Date</p>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-sec)' }}>{date}</p>
                  </div>
                  {/* Items */}
                  <div style={{ height: 32, width: '1px', background: 'var(--border)' }} />
                  <div>
                    <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.2rem' }}>Items</p>
                    <p style={{ fontWeight: 600, fontSize: '0.88rem', color: 'var(--text-sec)' }}>{itemCount} item{itemCount !== 1 ? 's' : ''}</p>
                  </div>
                  {/* Status badges */}
                  <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    <span style={{ padding: '0.25rem 0.7rem', borderRadius: 'var(--r-pill)', fontSize: '0.74rem', fontWeight: 700, color: s.color, background: s.bg }}>
                      {s.label}
                    </span>
                    <span style={{ padding: '0.25rem 0.7rem', borderRadius: 'var(--r-pill)', fontSize: '0.74rem', fontWeight: 700, color: p.color, background: p.color + '1a' }}>
                      {p.label}
                    </span>
                    <span style={{ padding: '0.25rem 0.7rem', borderRadius: 'var(--r-pill)', fontSize: '0.74rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-3)' }}>
                      {order.delivery_type === 'pickup' ? '🏫 Pickup' : '🚚 Delivery'}
                    </span>
                  </div>
                </div>
                {/* Total + arrow */}
                <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem' }}>
                  <p style={{ fontWeight: 900, fontSize: '1.15rem', color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>
                    ₹{parseFloat(order.total).toFixed(0)}
                  </p>
                  <span style={{ fontSize: '1rem', color: 'var(--text-muted)' }}>›</span>
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

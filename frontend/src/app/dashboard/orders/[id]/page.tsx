'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { ordersApi } from '@/lib/api';
import type { Order, OrderStatus } from '@/types';

// ─── Config ───────────────────────────────────────────────────────────────────

const STATUS_STEPS: { key: OrderStatus; label: string; icon: string }[] = [
  { key: 'placed',     label: 'Order Placed',    icon: '🛍️'  },
  { key: 'processing', label: 'Processing',       icon: '⚙️'  },
  { key: 'dispatched', label: 'Dispatched',       icon: '🚚'  },
  { key: 'delivered',  label: 'Delivered',        icon: '✅'  },
];

const STATUS_INDEX: Record<string, number> = {
  placed: 0, processing: 1, dispatched: 2, delivered: 3, cancelled: -1,
};

const PAY_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  pending:  { label: 'Pending Payment', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  paid:     { label: 'Paid',            color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  failed:   { label: 'Payment Failed',  color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
  refunded: { label: 'Refunded',        color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function OrderDetailPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const [order,    setOrder]    = useState<Order | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const res = await ordersApi.getById(params.id);
      setOrder(res.order);
    } catch (err: any) {
      if (err?.status === 404 || err?.message?.includes('not found')) setNotFound(true);
    } finally {
      setFetching(false);
    }
  }, [user, params.id]);

  useEffect(() => { load(); }, [load]);

  if (loading || (!user && !loading)) return null;

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (fetching) return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)' }}>
      <div className="skeleton" style={{ width: 120, height: '0.8rem', borderRadius: 4, marginBottom: '1.5rem' }} />
      <div className="skeleton" style={{ width: 200, height: '1.8rem', borderRadius: 4, marginBottom: '2rem' }} />
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {[1,2,3,4].map(i => <div key={i} className="skeleton" style={{ height: 60, borderRadius: 'var(--r-lg)' }} />)}
      </div>
    </div>
  );

  // ── Not found ────────────────────────────────────────────────────────────
  if (notFound || !order) return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
      <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Order not found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>This order doesn't exist or belongs to another account.</p>
      <Link href="/dashboard/orders"
        style={{ display: 'inline-block', padding: '0.6rem 1.5rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 700, textDecoration: 'none', fontSize: '0.9rem' }}>
        ← Back to Orders
      </Link>
    </div>
  );

  // ── Computed values ──────────────────────────────────────────────────────
  const isCancelled   = order.status === 'cancelled';
  const statusIdx     = STATUS_INDEX[order.status] ?? 0;
  const payConf       = PAY_CONFIG[order.payment_status] ?? PAY_CONFIG.pending;
  const date          = new Date(order.created_at).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  const subtotal      = parseFloat(order.subtotal).toFixed(2);
  const deliveryCharge = parseFloat(order.delivery_charge).toFixed(2);
  const total         = parseFloat(order.total).toFixed(2);

  return (
    <div style={{ maxWidth: 760, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)' }}>

      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35 }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
        <Link href="/dashboard" style={{ color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
        <span>›</span>
        <Link href="/dashboard/orders" style={{ color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>Orders</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-pri)', fontWeight: 600 }}>#{order.sequence_number}</span>
      </motion.div>

      {/* Title row */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.4rem,3vw,1.9rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-pri)', margin: 0 }}>
            Order #{order.sequence_number}
          </h1>
          <p style={{ fontSize: '0.84rem', color: 'var(--text-muted)', marginTop: '0.3rem' }}>{date}</p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <span style={{ padding: '0.3rem 0.85rem', borderRadius: 'var(--r-pill)', fontSize: '0.78rem', fontWeight: 700, color: payConf.color, background: payConf.bg }}>
            {payConf.label}
          </span>
          <span style={{ padding: '0.3rem 0.85rem', borderRadius: 'var(--r-pill)', fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-muted)', background: 'var(--surface-3)' }}>
            {order.delivery_type === 'pickup' ? '🏫 Pickup' : '🚚 Delivery'}
          </span>
        </div>
      </motion.div>

      {/* Status timeline */}
      {!isCancelled && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}
          style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1.25rem' }}>Status</h2>
          <div style={{ display: 'grid', gridTemplateColumns: `repeat(${STATUS_STEPS.length}, 1fr)`, gap: '0.5rem', position: 'relative' }}>
            {/* Progress line */}
            <div style={{ position: 'absolute', top: 20, left: '12.5%', right: '12.5%', height: 3, background: 'var(--border)', borderRadius: 99, zIndex: 0 }} />
            <div style={{ position: 'absolute', top: 20, left: '12.5%', width: `${Math.max(0, statusIdx) / (STATUS_STEPS.length - 1) * 75}%`, height: 3, background: 'var(--gradient-brand)', borderRadius: 99, zIndex: 1, transition: 'width 0.6s ease' }} />
            {STATUS_STEPS.map((step, i) => {
              const done   = i <= statusIdx;
              const active = i === statusIdx;
              return (
                <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', zIndex: 2 }}>
                  <div style={{ width: 40, height: 40, borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', background: done ? 'var(--gradient-brand)' : 'var(--surface-3)', border: active ? '2.5px solid var(--indigo)' : done ? '2.5px solid var(--indigo)' : '2.5px solid var(--border)', boxShadow: active ? '0 0 0 4px rgba(79,70,229,0.15)' : 'none', transition: 'all 0.3s' }}>
                    {step.icon}
                  </div>
                  <p style={{ fontSize: '0.72rem', fontWeight: active ? 800 : 600, color: done ? 'var(--text-pri)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3 }}>{step.label}</p>
                </div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* Cancelled badge */}
      {isCancelled && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
          style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', borderRadius: 'var(--r-lg)', padding: '1rem 1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <span style={{ fontSize: '1.4rem' }}>❌</span>
          <div>
            <p style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.9rem' }}>Order Cancelled</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>This order has been cancelled.</p>
          </div>
        </motion.div>
      )}

      {/* Items */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.4 }}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', overflow: 'hidden', marginBottom: '1.5rem' }}>
        <div style={{ padding: '1.1rem 1.4rem', borderBottom: '1px solid var(--border)' }}>
          <h2 style={{ fontSize: '0.85rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', margin: 0 }}>
            Items ({order.items?.length ?? 0})
          </h2>
        </div>
        {(order.items ?? []).length === 0 ? (
          <div style={{ padding: '1.5rem 1.4rem', color: 'var(--text-muted)', fontSize: '0.88rem' }}>No items found.</div>
        ) : (
          <div>
            {(order.items ?? []).map((item, idx) => {
              const name = item.product_name ?? item.file_name ?? 'Print Job';
              const type = item.print_job_id ? '🖨️' : '📦';
              const lineTotal = (item.quantity * parseFloat(item.unit_price)).toFixed(2);
              return (
                <div key={item.id}
                  style={{ display: 'grid', gridTemplateColumns: '2.5rem 1fr auto', gap: '0.75rem', alignItems: 'center', padding: '0.9rem 1.4rem', borderBottom: idx < (order.items?.length ?? 0) - 1 ? '1px solid var(--border)' : 'none' }}>
                  <span style={{ fontSize: '1.4rem', textAlign: 'center' }}>{type}</span>
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-pri)' }}>{name}</p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                      ₹{parseFloat(item.unit_price).toFixed(2)} × {item.quantity}
                    </p>
                  </div>
                  <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-pri)', textAlign: 'right' }}>₹{lineTotal}</p>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Price summary */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2, duration: 0.4 }}
        style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.25rem 1.4rem', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-sec)' }}>
            <span>Subtotal</span>
            <span>₹{subtotal}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-sec)' }}>
            <span>Delivery charge</span>
            <span>{parseFloat(order.delivery_charge) === 0 ? <span style={{ color: '#10b981', fontWeight: 700 }}>Free</span> : `₹${deliveryCharge}`}</span>
          </div>
          {order.notes && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--text-muted)', borderTop: '1px solid var(--border)', paddingTop: '0.55rem', marginTop: '0.1rem' }}>
              <span>Notes</span>
              <span style={{ maxWidth: '60%', textAlign: 'right', lineHeight: 1.4 }}>{order.notes}</span>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '1.05rem', fontWeight: 900, color: 'var(--text-pri)', borderTop: '1.5px solid var(--border)', paddingTop: '0.65rem', marginTop: '0.1rem' }}>
            <span>Total</span>
            <span style={{ fontFamily: 'var(--font-heading)' }}>₹{total}</span>
          </div>
        </div>
      </motion.div>

      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.25 }}>
        <Link href="/dashboard/orders"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.6rem 1.4rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border)', color: 'var(--text-sec)', fontWeight: 700, fontSize: '0.88rem', textDecoration: 'none', transition: 'border-color 0.18s' }}
          onMouseEnter={e => (e.currentTarget.style.borderColor = 'var(--indigo)')}
          onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}>
          ← All Orders
        </Link>
      </motion.div>
    </div>
  );
}

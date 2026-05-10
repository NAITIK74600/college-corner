'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { ordersApi } from '@/lib/api';
import type { Order } from '@/types';

const SP = { type: 'spring' as const, stiffness: 340, damping: 28 };

function CheckoutSuccessContent() {
  const searchParams = useSearchParams();
  const router       = useRouter();

  const orderId   = searchParams.get('orderId')   ?? '';
  const cfOrderId = searchParams.get('cfOrderId') ?? '';
  const method    = searchParams.get('method')    ?? '';
  const seqNum    = searchParams.get('seqNum')    ?? '';

  const [status,  setStatus]  = useState<'verifying' | 'success' | 'pending' | 'failed'>('verifying');
  const [order,   setOrder]   = useState<Order | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (!orderId || verifiedRef.current) return;
    verifiedRef.current = true;

    if (method === 'cod') {
      // COD — no verification needed; just fetch order details
      ordersApi.getById(orderId)
        .then((res) => { setOrder(res.order); setStatus('pending'); })
        .catch(() => setStatus('pending'));
      return;
    }

    // Cashfree — verify payment
    if (cfOrderId) {
      ordersApi.verifyPayment({ orderId, cfOrderId })
        .then((res) => {
          setStatus(res.success ? 'success' : 'failed');
          if (res.success) {
            ordersApi.getById(orderId).then((r) => setOrder(r.order)).catch(() => {});
          }
        })
        .catch(() => setStatus('failed'));
    } else {
      // No cfOrderId — maybe Cashfree redirected with custom params
      setStatus('pending');
    }
  }, [orderId, cfOrderId, method]);

  const displaySeq = order?.sequence_number ?? (seqNum ? parseInt(seqNum, 10) : null);

  return (
    <div style={{ minHeight: '70vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '2rem 1.5rem' }}>
      <motion.div initial={{ opacity: 0, y: 32, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
        style={{ maxWidth: 520, width: '100%', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: 'clamp(2rem, 5vw, 3rem)', textAlign: 'center', boxShadow: 'var(--shadow-lg)' }}>

        {status === 'verifying' && (
          <>
            <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>⏳</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Verifying Payment…</h1>
            <p style={{ color: 'var(--text-sec)', fontSize: '0.9rem' }}>Please wait while we confirm your payment.</p>
          </>
        )}

        {status === 'success' && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
              style={{ fontSize: '4rem', marginBottom: '1.1rem' }}>🎉</motion.div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#16a34a' }}>Payment Successful!</h1>
            <p style={{ color: 'var(--text-sec)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>Your order has been confirmed and is being prepared.</p>
            {displaySeq && (
              <div style={{ background: 'rgba(22,163,74,0.08)', border: '1.5px solid rgba(22,163,74,0.2)', borderRadius: 'var(--r-md)', padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: '#16a34a', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Order Number</p>
                <p style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', color: 'var(--text-pri)' }}>#{displaySeq}</p>
              </div>
            )}
          </>
        )}

        {status === 'pending' && (
          <>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
              style={{ fontSize: '4rem', marginBottom: '1.1rem' }}>📦</motion.div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>Order Placed!</h1>
            <p style={{ color: 'var(--text-sec)', fontSize: '0.92rem', marginBottom: '0.5rem' }}>
              {method === 'cod' ? 'Pay at pickup / delivery. Your order is being prepared.' : 'Awaiting payment confirmation.'}
            </p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem', marginBottom: '1.5rem' }}>Our team will approve and process your order shortly.</p>
            {displaySeq && (
              <div style={{ background: 'rgba(79,70,229,0.08)', border: '1.5px solid rgba(79,70,229,0.2)', borderRadius: 'var(--r-md)', padding: '1rem 1.5rem', marginBottom: '1.5rem' }}>
                <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--indigo)', letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: '0.25rem' }}>Order Number</p>
                <p style={{ fontSize: '2rem', fontWeight: 900, fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em', color: 'var(--text-pri)' }}>#{displaySeq}</p>
              </div>
            )}
          </>
        )}

        {status === 'failed' && (
          <>
            <div style={{ fontSize: '4rem', marginBottom: '1.1rem' }}>❌</div>
            <h1 style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem', color: '#ef4444' }}>Payment Failed</h1>
            <p style={{ color: 'var(--text-sec)', fontSize: '0.92rem', marginBottom: '1.5rem' }}>Your payment could not be verified. If money was deducted, it will be refunded within 5–7 days.</p>
          </>
        )}

        {/* Order item summary */}
        {order && order.items.length > 0 && (
          <div style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 'var(--r-md)', padding: '1rem', marginBottom: '1.5rem', textAlign: 'left' }}>
            <p style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-sec)', marginBottom: '0.6rem', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Items</p>
            {order.items.map((item) => (
              <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', padding: '0.3rem 0', borderBottom: '1px solid var(--border)', color: 'var(--text-pri)' }}>
                <span>{item.product_name ?? item.file_name ?? 'Item'}{item.quantity > 1 ? ` ×${item.quantity}` : ''}</span>
                <span style={{ fontWeight: 700 }}>₹{(parseFloat(item.unit_price) * item.quantity).toFixed(0)}</span>
              </div>
            ))}
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem', fontWeight: 900, paddingTop: '0.6rem', color: 'var(--text-pri)' }}>
              <span>Total</span>
              <span>₹{parseFloat(order.total).toFixed(0)}</span>
            </div>
          </div>
        )}

        {/* CTAs */}
        <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
          <motion.button onClick={() => router.push('/store')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={SP}
            style={{ padding: '0.72rem 1.5rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}>
            🛒 Back to Store
          </motion.button>
          <motion.button onClick={() => router.push('/print')} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }} transition={SP}
            style={{ padding: '0.72rem 1.5rem', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 700, fontSize: '0.9rem', cursor: 'pointer', fontFamily: 'var(--font-body)', boxShadow: 'var(--shadow-brand)' }}>
            🖨️ Print Jobs
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>Loading…</div>}>
      <CheckoutSuccessContent />
    </Suspense>
  );
}

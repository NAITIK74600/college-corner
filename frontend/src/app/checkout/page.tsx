'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { printApi, ordersApi, couponsApi } from '@/lib/api';
import type { PrintJob, PrintJobsResponse, CreateOrderResponse, CouponValidation } from '@/types';

const SP = { type: 'spring' as const, stiffness: 340, damping: 28 };

export default function CheckoutPage() {
  const router  = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { cart, totalAmount, clearCart } = useCart();

  const [pendingPrintJobs, setPendingPrintJobs] = useState<PrintJob[]>([]);
  const [selectedPrintIds, setSelectedPrintIds]  = useState<string[]>([]);
  const [deliveryType, setDeliveryType]           = useState<'pickup' | 'delivery'>('pickup');
  const [paymentMethod, setPaymentMethod]         = useState<'cashfree' | 'cod' | 'wallet'>('cashfree');
  const [notes,         setNotes]                 = useState('');
  const [placing,       setPlacing]               = useState(false);
  const [error,         setError]                 = useState('');

  // Coupon
  const [couponCode,    setCouponCode]    = useState('');
  const [couponApplying, setCouponApplying] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState<CouponValidation | null>(null);
  const [couponError,   setCouponError]   = useState('');

  // Redirect unauthenticated users
  useEffect(() => {
    if (!authLoading && !user) router.replace('/login');
  }, [authLoading, user, router]);

  // Load pending print jobs to bundle
  useEffect(() => {
    if (!user) return;
    printApi.listJobs().then((res: unknown) => {
      const r = res as PrintJobsResponse;
      const pending = (r.data ?? []).filter((j) => j.status === 'pending');
      setPendingPrintJobs(pending);
      setSelectedPrintIds(pending.map((j) => j.id)); // select all by default
    }).catch(() => {});
  }, [user]);

  const hasProducts   = cart.length > 0;
  const printSubtotal = pendingPrintJobs
    .filter((j) => selectedPrintIds.includes(j.id))
    .reduce((s, j) => s + parseFloat(j.amount), 0);

  const productSubtotal  = totalAmount;
  const subtotal         = productSubtotal + printSubtotal;
  const deliveryCharge   = hasProducts && deliveryType === 'delivery' && subtotal < 499 ? 29 : 0;
  const couponDiscount   = appliedCoupon ? appliedCoupon.discount : 0;
  const total            = Math.max(0, subtotal + deliveryCharge - couponDiscount);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) return;
    setCouponApplying(true);
    setCouponError('');
    try {
      const res = await couponsApi.validate(couponCode.trim(), subtotal) as { data: CouponValidation };
      setAppliedCoupon(res.data);
      setCouponCode('');
    } catch (err: any) {
      setCouponError(err?.message || err?.error || 'Invalid or expired coupon');
      setAppliedCoupon(null);
    } finally {
      setCouponApplying(false);
    }
  };

  const togglePrintJob = (id: string) => {
    setSelectedPrintIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handlePlaceOrder = async () => {
    if (cart.length === 0 && selectedPrintIds.length === 0) {
      setError('Add items to your cart or select a print job to continue.');
      return;
    }
    setError('');
    setPlacing(true);

    try {
      const payload = {
        items: cart.map((ci) => ({ productId: ci.id, qty: ci.qty, unitPrice: parseFloat(ci.price) })),
        printJobIds: selectedPrintIds,
        deliveryType,
        notes: notes.trim() || undefined,
        paymentMethod,
        couponCode: appliedCoupon?.code || undefined,
      };

      const result = await ordersApi.create(payload) as CreateOrderResponse;

      if (paymentMethod === 'cashfree' && result.paymentSessionId) {
        // Load Cashfree JS SDK dynamically
        const { load } = await import('@cashfreepayments/cashfree-js');
        const cashfree  = await load({ mode: process.env.NEXT_PUBLIC_CF_ENV === 'PRODUCTION' ? 'production' : 'sandbox' });
        clearCart();
        cashfree.checkout({
          paymentSessionId: result.paymentSessionId,
          redirectTarget:   '_self',
        });
      } else {
        // COD or wallet — go to success page
        clearCart();
        router.push(`/checkout/success?orderId=${result.orderId}&method=${paymentMethod}&seqNum=${result.seqNum}`);
      }
    } catch (err: any) {
      setError(err?.message || err?.error || 'Failed to place order. Please try again.');
    } finally {
      setPlacing(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <p style={{ color: 'var(--text-muted)' }}>Loading…</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div style={{ maxWidth: '920px', margin: '0 auto', padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1.5rem, 4vw, 2.5rem)' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }} style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '0.4rem' }}>CHECKOUT</p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>Review & Pay</h1>
        <p style={{ color: 'var(--text-sec)', marginTop: '0.3rem', fontSize: '0.95rem' }}>Confirm your order details below.</p>
      </motion.div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0,1fr) minmax(0,380px)', gap: '2rem', alignItems: 'start' }}>

        {/* Left column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>

          {/* Cart items */}
          {cart.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1.1rem', color: 'var(--text-pri)' }}>🛒 Cart Items ({cart.length})</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {cart.map((ci) => (
                  <div key={ci.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-pri)' }}>{ci.name}</p>
                      <p style={{ fontSize: '0.8rem', color: 'var(--text-sec)' }}>Qty: {ci.qty}</p>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>₹{(parseFloat(ci.price) * ci.qty).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </motion.section>
          )}

          {/* Print jobs */}
          {pendingPrintJobs.length > 0 && (
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-pri)' }}>🖨️ Print Jobs</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-sec)', marginBottom: '1rem' }}>Select which print jobs to include in this order.</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
                {pendingPrintJobs.map((job) => (
                  <label key={job.id} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', cursor: 'pointer', padding: '0.75rem', borderRadius: 'var(--r-md)', border: `1.5px solid ${selectedPrintIds.includes(job.id) ? 'var(--indigo)' : 'var(--border)'}`, background: selectedPrintIds.includes(job.id) ? 'rgba(79,70,229,0.06)' : 'var(--bg)', transition: 'all 0.15s' }}>
                    <input type="checkbox" checked={selectedPrintIds.includes(job.id)} onChange={() => togglePrintJob(job.id)} style={{ accentColor: 'var(--indigo)', width: 16, height: 16 }} />
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-pri)' }}>{job.file_name}</p>
                      <p style={{ fontSize: '0.75rem', color: 'var(--text-sec)' }}>{job.copies}× · {job.color_mode.toUpperCase()} · {job.page_size}{job.lamination ? ' · Laminated' : ''}</p>
                    </div>
                    <span style={{ fontWeight: 800, color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>₹{parseFloat(job.amount).toFixed(0)}</span>
                  </label>
                ))}
              </div>
            </motion.section>
          )}

          {/* Delivery type */}
          {hasProducts && (
            <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem' }}>
              <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-pri)' }}>🚚 Delivery</h2>
              <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                {(['pickup', 'delivery'] as const).map((type) => (
                  <motion.button key={type} onClick={() => setDeliveryType(type)} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} transition={SP}
                    style={{ flex: 1, minWidth: 140, padding: '0.9rem 1.2rem', borderRadius: 'var(--r-md)', border: `2px solid ${deliveryType === type ? 'var(--indigo)' : 'var(--border)'}`, background: deliveryType === type ? 'rgba(79,70,229,0.08)' : 'var(--bg)', cursor: 'pointer', textAlign: 'left', transition: 'all 0.15s' }}>
                    <p style={{ fontWeight: 800, fontSize: '0.92rem', color: deliveryType === type ? 'var(--indigo)' : 'var(--text-pri)', marginBottom: '0.2rem' }}>
                      {type === 'pickup' ? '🏪 Pickup' : '🏠 Hostel Delivery'}
                    </p>
                    <p style={{ fontSize: '0.78rem', color: 'var(--text-sec)' }}>
                      {type === 'pickup' ? 'Pick up from campus store' : subtotal >= 499 ? 'Free (₹499+ order)' : '₹29 delivery charge'}
                    </p>
                  </motion.button>
                ))}
              </div>
            </motion.section>
          )}

          {/* Payment method */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '1rem', color: 'var(--text-pri)' }}>💳 Payment Method</h2>
            <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
              {([
                { value: 'cashfree', label: '💳 Pay Online', sub: 'UPI, cards, netbanking via Cashfree' },
                { value: 'cod',      label: '💵 Cash on Delivery', sub: 'Pay at store or at delivery' },
                { value: 'wallet',   label: '💜 Pay with Wallet', sub: `Balance: ₹${parseFloat(user?.wallet ?? '0').toFixed(0)}${parseFloat(user?.wallet ?? '0') < total ? ' (insufficient)' : ''}` },
              ] as const).map((opt) => (
                <motion.button key={opt.value}
                  onClick={() => !(opt.value === 'wallet' && parseFloat(user?.wallet ?? '0') < total) && setPaymentMethod(opt.value)}
                  disabled={opt.value === 'wallet' && parseFloat(user?.wallet ?? '0') < total}
                  whileHover={{ scale: opt.value === 'wallet' && parseFloat(user?.wallet ?? '0') < total ? 1 : 1.02 }}
                  whileTap={{ scale: 0.98 }} transition={SP}
                  style={{ flex: 1, minWidth: 160, padding: '0.9rem 1.2rem', borderRadius: 'var(--r-md)', border: `2px solid ${paymentMethod === opt.value ? 'var(--indigo)' : 'var(--border)'}`, background: paymentMethod === opt.value ? 'rgba(79,70,229,0.08)' : 'var(--bg)', cursor: opt.value === 'wallet' && parseFloat(user?.wallet ?? '0') < total ? 'not-allowed' : 'pointer', textAlign: 'left', transition: 'all 0.15s', opacity: opt.value === 'wallet' && parseFloat(user?.wallet ?? '0') < total ? 0.55 : 1 }}>
                  <p style={{ fontWeight: 800, fontSize: '0.92rem', color: paymentMethod === opt.value ? 'var(--indigo)' : 'var(--text-pri)', marginBottom: '0.2rem' }}>{opt.label}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-sec)' }}>{opt.sub}</p>
                </motion.button>
              ))}
            </div>
          </motion.section>

          {/* Coupon */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.22 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-pri)' }}>🏷️ Coupon / Promo Code</h2>
            {appliedCoupon ? (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', borderRadius: 'var(--r-md)', background: 'rgba(22,163,74,0.08)', border: '1.5px solid #16a34a' }}>
                <div>
                  <p style={{ fontWeight: 800, fontSize: '0.92rem', color: '#16a34a' }}>✅ {appliedCoupon.code}</p>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-sec)' }}>{appliedCoupon.description} — saving ₹{appliedCoupon.discount.toFixed(0)}</p>
                </div>
                <button onClick={() => setAppliedCoupon(null)}
                  style={{ padding: '4px 10px', borderRadius: 'var(--r-pill)', border: '1px solid #16a34a', background: 'transparent', color: '#16a34a', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
                  ✕ Remove
                </button>
              </div>
            ) : (
              <div style={{ display: 'flex', gap: '0.6rem' }}>
                <input value={couponCode} onChange={e => { setCouponCode(e.target.value.toUpperCase()); setCouponError(''); }}
                  onKeyDown={e => e.key === 'Enter' && handleApplyCoupon()}
                  placeholder="Enter promo code"
                  style={{ flex: 1, padding: '0.62rem 1rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--text-pri)', fontSize: '0.9rem', outline: 'none', fontFamily: 'var(--font-body)', letterSpacing: '0.05em' }}
                />
                <motion.button onClick={handleApplyCoupon} disabled={couponApplying || !couponCode.trim()} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }} transition={SP}
                  style={{ padding: '0.62rem 1.2rem', borderRadius: 'var(--r-md)', border: 'none', background: couponCode.trim() ? 'var(--gradient-brand)' : 'var(--surface-2)', color: couponCode.trim() ? '#fff' : 'var(--text-muted)', fontWeight: 700, fontSize: '0.88rem', cursor: couponCode.trim() ? 'pointer' : 'not-allowed', fontFamily: 'var(--font-body)' }}>
                  {couponApplying ? '…' : 'Apply'}
                </motion.button>
              </div>
            )}
            <AnimatePresence>
              {couponError && (
                <motion.p initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#ef4444' }}>{couponError}</motion.p>
              )}
            </AnimatePresence>
          </motion.section>

          {/* Notes */}
          <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }}
            style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem' }}>
            <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', color: 'var(--text-pri)' }}>📝 Order Notes <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.82rem' }}>(optional)</span></h2>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="E.g., hostel block B room 204, or any special instructions…" rows={3}
              style={{ width: '100%', padding: '0.75rem 1rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--bg)', color: 'var(--text-pri)', fontSize: '0.88rem', resize: 'vertical', outline: 'none', fontFamily: 'var(--font-body)', boxSizing: 'border-box' }} />
          </motion.section>
        </div>

        {/* Right column — Order summary */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.15, duration: 0.45 }}
          style={{ position: 'sticky', top: '88px', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.75rem', display: 'flex', flexDirection: 'column', gap: '0.9rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-pri)', marginBottom: '0.2rem' }}>Order Summary</h2>

          {productSubtotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-sec)' }}>
              <span>Products</span>
              <span style={{ fontWeight: 700 }}>₹{productSubtotal.toFixed(0)}</span>
            </div>
          )}
          {printSubtotal > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-sec)' }}>
              <span>Print Jobs</span>
              <span style={{ fontWeight: 700 }}>₹{printSubtotal.toFixed(0)}</span>
            </div>
          )}
          {deliveryCharge > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: 'var(--text-sec)' }}>
              <span>Delivery</span>
              <span style={{ fontWeight: 700 }}>₹{deliveryCharge}</span>
            </div>
          )}
          {deliveryCharge === 0 && deliveryType === 'delivery' && hasProducts && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#16a34a' }}>
              <span>Delivery</span>
              <span style={{ fontWeight: 700 }}>FREE 🎉</span>
            </div>
          )}
          {couponDiscount > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.88rem', color: '#16a34a' }}>
              <span>Coupon ({appliedCoupon?.code})</span>
              <span style={{ fontWeight: 700 }}>−₹{couponDiscount.toFixed(0)}</span>
            </div>
          )}

          <div style={{ height: 1, background: 'var(--border)', margin: '0.2rem 0' }} />

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontWeight: 800, fontSize: '1rem', color: 'var(--text-pri)' }}>Total</span>
            <span style={{ fontWeight: 900, fontSize: '1.5rem', color: 'var(--text-pri)', fontFamily: 'var(--font-heading)', letterSpacing: '-0.03em' }}>₹{total.toFixed(0)}</span>
          </div>

          <AnimatePresence>
            {error && (
              <motion.p initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                style={{ fontSize: '0.82rem', color: '#ef4444', background: 'rgba(239,68,68,0.08)', padding: '0.6rem 0.85rem', borderRadius: 'var(--r-md)', lineHeight: 1.4 }}>
                {error}
              </motion.p>
            )}
          </AnimatePresence>

          <motion.button onClick={handlePlaceOrder} disabled={placing || total === 0} whileHover={!placing && total > 0 ? { scale: 1.03 } : {}} whileTap={!placing && total > 0 ? { scale: 0.97 } : {}} transition={SP}
            style={{ width: '100%', padding: '0.95rem', borderRadius: 'var(--r-pill)', border: 'none', background: placing || total === 0 ? 'var(--surface-2)' : 'var(--gradient-brand)', color: placing || total === 0 ? 'var(--text-muted)' : '#fff', fontWeight: 800, fontSize: '1rem', cursor: placing || total === 0 ? 'not-allowed' : 'pointer', boxShadow: !placing && total > 0 ? 'var(--shadow-brand)' : 'none', fontFamily: 'var(--font-heading)', letterSpacing: '-0.01em', transition: 'all 0.15s' }}>
            {placing ? 'Placing order…' : paymentMethod === 'cashfree' ? '💳 Pay ₹' + total.toFixed(0) + ' Online' : paymentMethod === 'wallet' ? '💜 Pay ₹' + total.toFixed(0) + ' from Wallet' : '📦 Place Order (COD)'}
          </motion.button>

          <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textAlign: 'center', lineHeight: 1.5 }}>
            {paymentMethod === 'cashfree' ? 'You will be redirected to Cashfree for secure payment.' : paymentMethod === 'wallet' ? 'Amount will be deducted from your wallet balance instantly.' : 'Your order will be prepared. Payment at delivery/pickup.'}
          </p>
        </motion.div>
      </div>
    </div>
  );
}

'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { printApi, ordersApi, walletApi } from '@/lib/api';
import { PrintJob, Order, OrderListResponse, WalletTx } from '@/types';

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08, delayChildren: 0.1 } },
};
const cardVariant = {
  hidden:   { opacity: 0, y: 24, filter: 'blur(4px)' },
  visible:  { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.5, ease: [0.25,0.1,0.25,1] as [number, number, number, number] } },
};

const quickActions = [
  { label: 'Browse Store',   icon: '🛒', href: '/store',                  gradient: 'linear-gradient(135deg,#4f46e5,#6366f1)' },
  { label: 'Print Document', icon: '🖨️', href: '/print',                  gradient: 'linear-gradient(135deg,#7c3aed,#8b5cf6)' },
  { label: 'Order History',  icon: '📦', href: '/dashboard/orders',       gradient: 'linear-gradient(135deg,#0ea5e9,#38bdf8)'  },
  { label: 'Print Jobs',     icon: '🗂️', href: '/dashboard/print-jobs',   gradient: 'linear-gradient(135deg,#10b981,#34d399)'  },
  { label: 'Wishlist',       icon: '💙', href: '/dashboard/wishlist',      gradient: 'linear-gradient(135deg,#e11d48,#f472b6)'  },
];

export default function DashboardPage() {
  const router = useRouter();
  const { user, loading, logout, refresh } = useAuth();
  const [printJobs,     setPrintJobs]     = useState<PrintJob[]>([]);
  const [loadingPrint,  setLoadingPrint]  = useState(false);
  const [recentOrders,  setRecentOrders]  = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(false);
  const [walletHistory, setWalletHistory] = useState<WalletTx[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(false);

  // Top-up modal state
  const [topUpOpen,    setTopUpOpen]    = useState(false);
  const [topUpAmount,  setTopUpAmount]  = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [topUpError,   setTopUpError]   = useState('');
  const [toast,        setToast]        = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (!user) return;
    setLoadingPrint(true);
    printApi.listJobs()
      .then((res: any) => setPrintJobs((res.data || []).slice(0, 5)))
      .catch(() => {})
      .finally(() => setLoadingPrint(false));
  }, [user]);

  useEffect(() => {
    if (!user) return;
    setLoadingOrders(true);
    ordersApi.list()
      .then((res) => {
        const r = res as OrderListResponse;
        setRecentOrders((r.orders || []).slice(0, 5));
      })
      .catch(() => {})
      .finally(() => setLoadingOrders(false));
  }, [user]);

  const loadWalletHistory = useCallback(() => {
    if (!user) return;
    setLoadingWallet(true);
    walletApi.history()
      .then((res) => setWalletHistory((res.data || []).slice(0, 10)))
      .catch(() => {})
      .finally(() => setLoadingWallet(false));
  }, [user]);

  useEffect(() => { loadWalletHistory(); }, [loadWalletHistory]);

  // Handle redirect back from Cashfree after top-up
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const topupStatus = params.get('topup');
    const ref         = params.get('ref');
    if (topupStatus === 'success' && ref) {
      walletApi.verifyTopUp(ref)
        .then((r) => {
          if (r.success) {
            showToast(`Wallet credited ₹${r.amount?.toFixed(0) ?? ''} ✅`);
            refresh();
            loadWalletHistory();
            router.replace('/dashboard');
          }
        })
        .catch(() => showToast('Top-up verification failed'));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleTopUp = async () => {
    const amt = parseFloat(topUpAmount);
    if (!amt || isNaN(amt) || amt < 10) { setTopUpError('Enter an amount (min ₹10)'); return; }
    if (amt > 10000) { setTopUpError('Max top-up is ₹10,000'); return; }
    setTopUpLoading(true); setTopUpError('');
    try {
      const result = await walletApi.initTopUp(amt);
      const { load } = await import('@cashfreepayments/cashfree-js');
      const cashfree = await load({ mode: process.env.NEXT_PUBLIC_CF_ENV === 'PRODUCTION' ? 'production' : 'sandbox' });
      setTopUpOpen(false);
      cashfree.checkout({ paymentSessionId: result.paymentSessionId, redirectTarget: '_self' });
    } catch (e: any) {
      setTopUpError(e?.error || e?.message || 'Failed to initiate payment');
    } finally {
      setTopUpLoading(false);
    }
  };

  if (loading || !user) {
    return (
      <div style={{ minHeight: 'calc(100vh - 68px)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 0.9, repeat: Infinity, ease: 'linear' }}
          style={{ width: 32, height: 32, borderRadius: '50%', border: '3px solid var(--border-brand)', borderTopColor: 'var(--indigo)' }}
        />
      </div>
    );
  }

  const statCards = [
    { label: 'Active Orders',  value: loadingOrders ? '…' : String(recentOrders.filter(o => o.payment_status === 'pending').length),  icon: '📦', color: '#4f46e5', bg: 'rgba(79,70,229,0.08)',  border: 'rgba(79,70,229,0.2)', action: null },
    { label: 'Print Jobs',     value: loadingPrint ? '…' : String(printJobs.length),  icon: '🖨️', color: '#7c3aed', bg: 'rgba(124,58,237,0.08)', border: 'rgba(124,58,237,0.2)', action: null },
    { label: 'Wallet Balance', value: `₹${parseFloat(user.wallet).toFixed(0)}`, icon: '💳', color: '#0891b2', bg: 'rgba(8,145,178,0.08)',  border: 'rgba(8,145,178,0.2)', action: () => setTopUpOpen(true) },
    { label: 'Orders Placed',  value: loadingOrders ? '…' : String(recentOrders.length), icon: '📊', color: '#059669', bg: 'rgba(5,150,105,0.08)',  border: 'rgba(5,150,105,0.2)', action: null },
  ];

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = user.name.split(' ')[0];

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3rem)' }}>

      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.25,0.1,0.25,1] }}
        style={{ marginBottom: '2.5rem', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}
      >
        <div>
          <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '0.4rem' }}>
            DASHBOARD
          </p>
          <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.5rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>
            {greeting}, {firstName} 👋
          </h1>
          <p style={{ color: 'var(--text-sec)', marginTop: '0.4rem' }}>
            {user.email}
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
          <Link href="/profile">
            <motion.div
              whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
              style={{
                padding: '0.55rem 1.2rem',
                borderRadius: 'var(--r-pill)',
                border: '1.5px solid var(--border-strong)',
                background: 'var(--surface)',
                color: 'var(--text-sec)',
                fontWeight: 700, fontSize: '0.85rem',
                cursor: 'pointer',
              }}
            >
              Profile
            </motion.div>
          </Link>
          <motion.button
            onClick={async () => { await logout(); router.push('/'); }}
            whileHover={{ scale: 1.04 }}
            whileTap={{ scale: 0.97 }}
            style={{
              padding: '0.55rem 1.2rem',
              borderRadius: 'var(--r-pill)',
              border: '1.5px solid var(--border-strong)',
              background: 'var(--surface)',
              color: 'var(--text-sec)',
              fontWeight: 700, fontSize: '0.85rem',
              cursor: 'pointer',
            }}
          >
            Sign out
          </motion.button>
        </div>
      </motion.div>

      {/* Stat Cards */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px,1fr))', gap: '1.1rem', marginBottom: '2.5rem' }}
      >
        {statCards.map(({ label, value, icon, color, bg, border, action }) => (
          <motion.div
            key={label}
            variants={cardVariant}
            whileHover={{ y: -4, boxShadow: 'var(--shadow-lg)' }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            style={{
              padding: '1.6rem',
              borderRadius: 'var(--r-lg)',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              boxShadow: 'var(--shadow-sm)',
              position: 'relative', overflow: 'hidden',
              cursor: action ? 'pointer' : 'default',
            }}
            onClick={action ?? undefined}
          >
            <div style={{ position: 'absolute', top: 0, right: 0, width: 100, height: 100, background: bg, borderRadius: '0 var(--r-lg) 0 100%', opacity: 0.6 }} />
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 42, height: 42, borderRadius: 'var(--r-sm)',
              background: bg, border: `1px solid ${border}`,
              fontSize: '1.3rem', marginBottom: '1rem',
            }}>
              {icon}
            </div>
            <div style={{ fontSize: '1.75rem', fontWeight: 900, letterSpacing: '-0.04em', color, marginBottom: '0.2rem' }}>
              {value}
            </div>
            <div style={{ fontSize: '0.82rem', color: 'var(--text-sec)', fontWeight: 600 }}>{label}</div>
            {action && (
              <div style={{ fontSize: '0.72rem', color, fontWeight: 700, marginTop: '0.4rem', opacity: 0.8 }}>
                Tap to top up →
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3, duration: 0.5 }}
        style={{ marginBottom: '2.5rem' }}
      >
        <h2 style={{ fontSize: '1.05rem', fontWeight: 800, marginBottom: '1rem', letterSpacing: '-0.02em' }}>
          Quick actions
        </h2>
        <div style={{ display: 'flex', gap: '0.9rem', flexWrap: 'wrap' }}>
          {quickActions.map(({ label, icon, href, gradient }) => (
            <motion.a
              key={label}
              href={href}
              whileHover={{ scale: 1.04, boxShadow: '0 8px 28px rgba(79,70,229,0.3)' }}
              whileTap={{ scale: 0.97 }}
              transition={{ type: 'spring', stiffness: 400, damping: 22 }}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '9px',
                padding: '0.7rem 1.4rem',
                borderRadius: 'var(--r-pill)',
                background: gradient,
                color: '#fff',
                fontWeight: 700, fontSize: '0.9rem',
                textDecoration: 'none',
                boxShadow: 'var(--shadow-brand)',
                cursor: 'pointer',
              }}
            >
              <span>{icon}</span> {label}
            </motion.a>
          ))}
        </div>
      </motion.div>

      {/* Recent Print Jobs */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ marginBottom: '2.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Recent Print Jobs</h2>
          <a href="/dashboard/print-jobs" style={{ fontSize: '0.82rem', color: 'var(--indigo)', fontWeight: 700, textDecoration: 'none' }}>View all →</a>
        </div>

        {loadingPrint ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[1, 2].map(i => <div key={i} style={{ height: '58px', borderRadius: 'var(--r-lg)', background: 'var(--surface-2)' }} />)}
          </div>
        ) : printJobs.length === 0 ? (
          <div style={{
            padding: '2.5rem 2rem',
            borderRadius: 'var(--r-xl)',
            background: 'var(--gradient-subtle)',
            border: '1px dashed var(--border-brand)',
            textAlign: 'center',
          }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>🖨️</div>
            <p style={{ fontSize: '0.92rem', color: 'var(--indigo)', fontWeight: 700, marginBottom: '0.3rem' }}>No print jobs yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Head to <a href="/print" style={{ color: 'var(--indigo)', fontWeight: 700 }}>Print</a> to upload your first document.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {printJobs.map((job, idx) => {
              const statusColors: Record<string, { bg: string; text: string }> = {
                pending:    { bg: 'rgba(234,179,8,0.12)',   text: '#b45309' },
                paid:       { bg: 'rgba(59,130,246,0.12)',  text: '#1d4ed8' },
                processing: { bg: 'rgba(124,58,237,0.12)',  text: '#6d28d9' },
                printed:    { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
                ready:      { bg: 'rgba(16,185,129,0.18)',  text: '#065f46' },
                failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
              };
              const sc = statusColors[job.status] ?? { bg: 'var(--surface-2)', text: 'var(--text-sec)' };
              return (
                <motion.div
                  key={job.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.05 }}
                  onClick={() => router.push(`/dashboard/print-jobs/${job.id}`)}
                  style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.8rem 1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}
                >
                  <span style={{ fontSize: '1.25rem' }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.file_name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.1rem' }}>
                      {job.color_mode === 'bw' ? 'B&W' : 'Color'} · {job.page_size} · {job.total_pages}pg × {job.copies} · ₹{job.amount}
                    </p>
                  </div>
                  <span style={{ padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)', background: sc.bg, color: sc.text, fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                    {job.status}
                  </span>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
      {/* Recent Orders */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5, duration: 0.5 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Recent Orders</h2>
          <Link href="/dashboard/orders" style={{ fontSize: '0.82rem', color: 'var(--indigo)', fontWeight: 700, textDecoration: 'none' }}>View all →</Link>
        </div>
        {loadingOrders ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[1, 2].map(i => <div key={i} style={{ height: '58px', borderRadius: 'var(--r-lg)', background: 'var(--surface-2)' }} />)}
          </div>
        ) : recentOrders.length === 0 ? (
          <div style={{ padding: '2.5rem 2rem', borderRadius: 'var(--r-xl)', background: 'var(--gradient-subtle)', border: '1px dashed var(--border-brand)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>📦</div>
            <p style={{ fontSize: '0.92rem', color: 'var(--indigo)', fontWeight: 700, marginBottom: '0.3rem' }}>No orders yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>
              Head to <a href="/store" style={{ color: 'var(--indigo)', fontWeight: 700 }}>Store</a> to place your first order.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {recentOrders.map((order, idx) => {
              const STATUS_STEPS: Order['status'][] = ['placed', 'processing', 'dispatched', 'delivered'];
              const statusColors: Record<string, { bg: string; text: string }> = {
                pending:    { bg: 'rgba(234,179,8,0.12)',   text: '#b45309' },
                paid:       { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
                failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
                refunded:   { bg: 'rgba(59,130,246,0.12)',  text: '#1d4ed8' },
              };
              const deliveryBadge: Record<string, { bg: string; text: string; label: string }> = {
                placed:     { bg: 'rgba(79,70,229,0.10)',  text: '#4f46e5', label: 'Placed' },
                processing: { bg: 'rgba(234,179,8,0.12)',  text: '#b45309', label: 'Processing' },
                dispatched: { bg: 'rgba(14,165,233,0.12)', text: '#0369a1', label: 'Dispatched' },
                delivered:  { bg: 'rgba(16,185,129,0.12)', text: '#047857', label: 'Delivered' },
                cancelled:  { bg: 'rgba(239,68,68,0.12)',  text: '#b91c1c', label: 'Cancelled' },
              };
              const sc  = statusColors[order.payment_status] ?? { bg: 'var(--surface-2)', text: 'var(--text-sec)' };
              const ds  = deliveryBadge[order.status ?? 'placed'] ?? deliveryBadge['placed'];
              const stepIdx = STATUS_STEPS.indexOf(order.status as any);
              return (
                <motion.div key={order.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  onClick={() => router.push(`/dashboard/orders/${order.id}`)}
                  style={{ padding: '0.9rem 1.1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', cursor: 'pointer' }}>
                  {/* Top row */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', marginBottom: order.status !== 'cancelled' ? '0.75rem' : 0 }}>
                    <span style={{ fontSize: '1.25rem' }}>📦</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>Order #{order.sequence_number}</p>
                      <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.1rem' }}>
                        {order.items?.length ?? 0} item{(order.items?.length ?? 0) !== 1 ? 's' : ''} · ₹{parseFloat(order.total).toFixed(0)} · {order.delivery_type}
                      </p>
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.3rem' }}>
                      <span style={{ padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)', background: sc.bg, color: sc.text, fontSize: '0.7rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap' }}>
                        {order.payment_status}
                      </span>
                      <span style={{ padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)', background: ds.bg, color: ds.text, fontSize: '0.7rem', fontWeight: 700, whiteSpace: 'nowrap' }}>
                        {ds.label}
                      </span>
                    </div>
                  </div>
                  {/* Status timeline — only for non-cancelled delivery orders */}
                  {order.status !== 'cancelled' && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: 0, paddingLeft: '2.15rem' }}>
                      {STATUS_STEPS.map((step, i) => {
                        const done    = i <= stepIdx;
                        const current = i === stepIdx;
                        return (
                          <div key={step} style={{ display: 'flex', alignItems: 'center', flex: i < STATUS_STEPS.length - 1 ? 1 : 'none' }}>
                            <div style={{ width: 10, height: 10, borderRadius: '50%', background: done ? 'var(--indigo)' : 'var(--surface-3)', border: current ? '2px solid var(--indigo)' : '1.5px solid var(--border-strong)', flexShrink: 0, boxShadow: current ? '0 0 0 3px rgba(79,70,229,0.18)' : 'none' }} />
                            {i < STATUS_STEPS.length - 1 && (
                              <div style={{ flex: 1, height: 2, background: i < stepIdx ? 'var(--indigo)' : 'var(--surface-3)', minWidth: 20 }} />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
      {/* Wallet Transaction History */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.55, duration: 0.5 }}
        style={{ marginTop: '2.5rem' }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 800, letterSpacing: '-0.02em' }}>Wallet History</h2>
          <motion.button onClick={() => setTopUpOpen(true)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '0.4rem 1rem', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: '#fff', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>
            + Top Up
          </motion.button>
        </div>
        {loadingWallet ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
            {[1,2].map(i => <div key={i} style={{ height: '50px', borderRadius: 'var(--r-lg)', background: 'var(--surface-2)' }} />)}
          </div>
        ) : walletHistory.length === 0 ? (
          <div style={{ padding: '2rem', borderRadius: 'var(--r-xl)', background: 'var(--gradient-subtle)', border: '1px dashed var(--border-brand)', textAlign: 'center' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.4rem' }}>💳</div>
            <p style={{ fontSize: '0.88rem', color: 'var(--indigo)', fontWeight: 700 }}>No transactions yet</p>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginTop: '0.2rem' }}>Top up your wallet to get started.</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.55rem' }}>
            {walletHistory.map((tx, idx) => (
              <motion.div key={tx.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
                style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.75rem 1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <span style={{ fontSize: '1.15rem' }}>{tx.type === 'credit' ? '⬆️' : '⬇️'}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.description ?? (tx.type === 'credit' ? 'Top-up' : 'Payment')}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                    {new Date(tx.created_at).toLocaleDateString('en-IN', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' })}
                  </p>
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.92rem', color: tx.type === 'credit' ? '#059669' : '#dc2626', fontFamily: 'var(--font-heading)' }}>
                  {tx.type === 'credit' ? '+' : '-'}₹{parseFloat(tx.amount).toFixed(0)}
                </span>
              </motion.div>
            ))}
          </div>
        )}
      </motion.div>

      {/* Top-Up Modal */}
      <AnimatePresence>
        {topUpOpen && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              style={{ width: '100%', maxWidth: 380, background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '2rem', boxShadow: 'var(--shadow-lg)' }}
            >
              <h2 style={{ fontSize: '1.15rem', fontWeight: 800, marginBottom: '0.3rem' }}>Top Up Wallet 💳</h2>
              <p style={{ color: 'var(--text-sec)', fontSize: '0.85rem', marginBottom: '1.4rem' }}>Current balance: ₹{parseFloat(user.wallet).toFixed(0)}</p>
              <div style={{ display: 'flex', gap: '0.6rem', flexWrap: 'wrap', marginBottom: '1rem' }}>
                {[50, 100, 200, 500].map(amt => (
                  <motion.button key={amt} onClick={() => setTopUpAmount(String(amt))} whileHover={{ scale: 1.05 }}
                    style={{ padding: '0.4rem 0.9rem', borderRadius: 'var(--r-pill)', border: `1.5px solid ${topUpAmount === String(amt) ? 'var(--indigo)' : 'var(--border-strong)'}`, background: topUpAmount === String(amt) ? 'rgba(79,70,229,0.1)' : 'var(--surface)', fontWeight: 700, fontSize: '0.83rem', cursor: 'pointer', color: topUpAmount === String(amt) ? 'var(--indigo)' : 'var(--text)' }}>
                    ₹{amt}
                  </motion.button>
                ))}
              </div>
              <input
                type="number" placeholder="Or enter custom amount" min="10" max="10000"
                value={topUpAmount} onChange={e => setTopUpAmount(e.target.value)}
                style={{ width: '100%', padding: '0.65rem 0.9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text)', fontSize: '0.92rem', marginBottom: '0.75rem', boxSizing: 'border-box' }}
              />
              {topUpError && <p style={{ fontSize: '0.8rem', color: '#ef4444', marginBottom: '0.75rem' }}>{topUpError}</p>}
              <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
                <motion.button onClick={() => { setTopUpOpen(false); setTopUpAmount(''); setTopUpError(''); }} whileHover={{ scale: 1.03 }}
                  style={{ padding: '0.5rem 1.1rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
                  Cancel
                </motion.button>
                <motion.button onClick={handleTopUp} disabled={topUpLoading} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                  style={{ padding: '0.5rem 1.4rem', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg,#0891b2,#0e7490)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: topUpLoading ? 'not-allowed' : 'pointer', opacity: topUpLoading ? 0.7 : 1 }}>
                  {topUpLoading ? 'Redirecting…' : 'Pay Online'}
                </motion.button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{ position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)', padding: '0.65rem 1.4rem', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg,#1e1b4b,#2e1065)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 2000, whiteSpace: 'nowrap' }}>
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}

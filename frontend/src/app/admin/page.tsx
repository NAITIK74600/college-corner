'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ResponsiveContainer,
  AreaChart, Area,
  BarChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, Legend,
} from 'recharts';
import { useAuth } from '@/context/AuthContext';
import { adminApi, ordersApi, couponsApi } from '@/lib/api';

type Tab = 'stats' | 'orders' | 'print' | 'products' | 'users' | 'printers' | 'coupons' | 'settings';

const TABS: { id: Tab; label: string; icon: string }[] = [
  { id: 'stats',    label: 'Overview',   icon: '📊' },
  { id: 'orders',   label: 'Orders',     icon: '📦' },
  { id: 'print',    label: 'Print Jobs', icon: '🖨️' },
  { id: 'products', label: 'Products',   icon: '🛍️' },
  { id: 'printers', label: 'Printers',   icon: '🖥️' },
  { id: 'users',    label: 'Users',      icon: '👥' },
  { id: 'coupons',  label: 'Coupons',    icon: '🏷️' },
  { id: 'settings', label: 'Settings',   icon: '⚙️' },
];

const PRINT_STATUSES = ['pending','paid','processing','printed','ready','failed'];

const cardVariant = { hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0 } };

// ─── Status badge helpers ────────────────────────────────────────────────────
const ORDER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:  { bg: 'rgba(234,179,8,0.12)',  text: '#b45309' },
  paid:     { bg: 'rgba(16,185,129,0.12)', text: '#047857' },
  failed:   { bg: 'rgba(239,68,68,0.12)',  text: '#b91c1c' },
  refunded: { bg: 'rgba(59,130,246,0.12)', text: '#1d4ed8' },
};
const PRINT_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: 'rgba(234,179,8,0.12)',   text: '#b45309' },
  paid:       { bg: 'rgba(59,130,246,0.12)',  text: '#1d4ed8' },
  processing: { bg: 'rgba(124,58,237,0.12)',  text: '#6d28d9' },
  printed:    { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
  ready:      { bg: 'rgba(16,185,129,0.18)',  text: '#065f46' },
  failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
};

function Badge({ label, colors }: { label: string; colors: { bg: string; text: string } }) {
  return (
    <span style={{
      padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)',
      background: colors.bg, color: colors.text,
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize', whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  );
}

function Skeleton({ h = 48 }: { h?: number }) {
  return <div style={{ height: h, borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', marginBottom: '0.65rem' }} />;
}

// ─── Chart card wrapper ──────────────────────────────────────────────────────
function ChartCard({ title, children, span = 1 }: { title: string; children: React.ReactNode; span?: number }) {
  return (
    <div style={{
      gridColumn: `span ${span}`,
      padding: '1.4rem 1.5rem',
      borderRadius: 'var(--r-lg)',
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <p style={{ fontSize: '0.78rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: '1rem' }}>{title}</p>
      {children}
    </div>
  );
}

const STATUS_PIE_COLORS: Record<string, string> = {
  placed: '#4f46e5', processing: '#f59e0b', dispatched: '#0ea5e9', delivered: '#10b981', cancelled: '#ef4444',
};

// ─── Stats Tab ───────────────────────────────────────────────────────────────
function StatsTab({ stats, analytics, days, onDaysChange }: { stats: any; analytics: any; days: number; onDaysChange: (d: number) => void }) {
  if (!stats) return <>{[1,2,3,4,5].map(i => <Skeleton key={i} h={80} />)}</>;
  const cards = [
    { label: 'Total Revenue',   value: `₹${parseFloat(stats.revenue?.total_revenue || 0).toFixed(0)}`, icon: '💰', color: '#059669' },
    { label: 'Total Orders',    value: stats.orders?.total ?? '—',     icon: '📦', color: '#4f46e5' },
    { label: 'Pending Orders',  value: stats.orders?.pending ?? '—',   icon: '⏳', color: '#b45309' },
    { label: 'Print Jobs',      value: stats.print?.total ?? '—',      icon: '🖨️', color: '#7c3aed' },
    { label: 'Ready to Pick',   value: stats.print?.ready ?? '—',      icon: '✅', color: '#047857' },
    { label: 'Total Products',  value: stats.products?.total ?? '—',   icon: '🛍️', color: '#0891b2' },
    { label: 'Active Products', value: stats.products?.active ?? '—',  icon: '🟢', color: '#059669' },
    { label: 'Total Users',     value: stats.users?.total ?? '—',      icon: '👥', color: '#6d28d9' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.75rem' }}>
      {/* KPI cards */}
      <motion.div variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.05 } } }} initial="hidden" animate="visible"
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px,1fr))', gap: '1rem' }}>
        {cards.map(c => (
          <motion.div key={c.label} variants={cardVariant}
            style={{ padding: '1.4rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', boxShadow: 'var(--shadow-sm)' }}>
            <div style={{ fontSize: '1.5rem', marginBottom: '0.5rem' }}>{c.icon}</div>
            <div style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', color: c.color }}>{c.value}</div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-sec)', fontWeight: 600, marginTop: '0.2rem' }}>{c.label}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Time-range picker */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
        <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.07em' }}>Show last</span>
        {[7, 14, 30, 60, 90].map(d => (
          <button key={d} onClick={() => onDaysChange(d)}
            style={{
              padding: '0.28rem 0.85rem', borderRadius: 'var(--r-pill)',
              border: '1.5px solid', cursor: 'pointer', fontWeight: 700, fontSize: '0.8rem',
              borderColor: days === d ? 'var(--indigo)' : 'var(--border)',
              background:  days === d ? 'rgba(79,70,229,0.08)' : 'transparent',
              color:       days === d ? 'var(--indigo)' : 'var(--text-muted)',
              transition: 'all 0.15s',
            }}>
            {d}d
          </button>
        ))}
      </div>

      {!analytics ? (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          {[1,2,3,4].map(i => <Skeleton key={i} h={240} />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(12, 1fr)', gap: '1rem' }}>
          {/* Revenue area chart — full width */}
          <ChartCard title={`Revenue (last ${days} days)`} span={12}>
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={analytics.dailyRevenue} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                <defs>
                  <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#4f46e5" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                <Tooltip formatter={(v: any) => [`₹${Number(v).toFixed(0)}`, 'Revenue']} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
                <Area type="monotone" dataKey="revenue" stroke="#4f46e5" strokeWidth={2.5} fill="url(#revGrad)" dot={false} activeDot={{ r: 4 }} />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Orders bar chart — left 8 cols */}
          <ChartCard title={`Orders per day (last ${days} days)`} span={8}>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={analytics.dailyOrders} margin={{ top: 4, right: 8, left: -10, bottom: 0 }} barSize={analytics.dailyOrders?.length > 20 ? 8 : 18}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
                <XAxis dataKey="day" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} interval="preserveStartEnd" />
                <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip formatter={(v: any) => [v, 'Orders']} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
                <Bar dataKey="orders" fill="#7c3aed" radius={[4,4,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Order status pie — right 4 cols */}
          <ChartCard title="Order status breakdown" span={4}>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie data={analytics.statusBreakdown} dataKey="count" nameKey="status" cx="50%" cy="45%" outerRadius={70} innerRadius={38} paddingAngle={3}>
                  {analytics.statusBreakdown.map((entry: any) => (
                    <Cell key={entry.status} fill={STATUS_PIE_COLORS[entry.status] ?? '#94a3b8'} />
                  ))}
                </Pie>
                <Tooltip formatter={(v: any, name: any) => [v, name]} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
                <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ fontSize: 12, color: 'var(--text-sec)', textTransform: 'capitalize' }}>{v}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          {/* Top products bar — full width */}
          {analytics.topProducts?.length > 0 && (
            <ChartCard title="Top products by revenue" span={12}>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={analytics.topProducts} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }} barSize={16}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} tickLine={false} axisLine={false} tickFormatter={(v) => `₹${v}`} />
                  <YAxis type="category" dataKey="name" tick={{ fontSize: 12, fill: 'var(--text-pri)', fontWeight: 600 }} tickLine={false} axisLine={false} width={120} />
                  <Tooltip formatter={(v: any) => [`₹${Number(v).toFixed(0)}`, 'Revenue']} contentStyle={{ borderRadius: 10, border: '1px solid var(--border)', fontSize: 13 }} />
                  <Bar dataKey="revenue" fill="#10b981" radius={[0,4,4,0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartCard>
          )}
        </div>
      )}
    </div>
  );
}

const DELIVERY_STATUSES = ['placed','processing','dispatched','delivered','cancelled'];
const DELIVERY_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  placed:     { bg: 'rgba(79,70,229,0.10)',  text: '#4f46e5' },
  processing: { bg: 'rgba(234,179,8,0.12)',  text: '#b45309' },
  dispatched: { bg: 'rgba(14,165,233,0.12)', text: '#0369a1' },
  delivered:  { bg: 'rgba(16,185,129,0.12)', text: '#047857' },
  cancelled:  { bg: 'rgba(239,68,68,0.12)',  text: '#b91c1c' },
};

// ─── Orders Tab ──────────────────────────────────────────────────────────────
function OrdersTab({ orders, onApprove, onDeliveryStatus }: { orders: any[]; onApprove: (id: string) => void; onDeliveryStatus: (id: string, s: string) => void }) {
  if (!orders) return <>{[1,2,3].map(i => <Skeleton key={i} />)}</>;
  if (orders.length === 0) return <Empty icon="📦" text="No orders yet" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {orders.map((o, idx) => {
        const sc = ORDER_STATUS_COLORS[o.payment_status] ?? { bg: 'var(--surface-2)', text: 'var(--text-sec)' };
        const dc = DELIVERY_STATUS_COLORS[o.status ?? 'placed'] ?? DELIVERY_STATUS_COLORS['placed'];
        return (
          <motion.div key={o.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.2rem' }}>📦</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>Order #{o.sequence_number}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.1rem' }}>
                {o.user_name ?? o.user_id} · ₹{parseFloat(o.total).toFixed(0)} · {o.delivery_type}
              </p>
            </div>
            <Badge label={o.payment_status} colors={sc} />
            <Badge label={o.status ?? 'placed'} colors={dc} />
            <select
              value={o.status ?? 'placed'}
              onChange={e => onDeliveryStatus(o.id, e.target.value)}
              style={{
                padding: '0.28rem 0.6rem', borderRadius: 'var(--r-sm)',
                border: '1.5px solid var(--border-strong)', background: 'var(--surface)',
                color: 'var(--text-pri)', fontSize: '0.78rem', fontWeight: 600,
                cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}
            >
              {DELIVERY_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
            {o.payment_status === 'pending' && (
              <motion.button
                onClick={() => onApprove(o.id)}
                whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                style={{
                  padding: '0.3rem 0.85rem', borderRadius: 'var(--r-pill)',
                  background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
                  color: '#fff', fontWeight: 700, fontSize: '0.78rem',
                  border: 'none', cursor: 'pointer',
                }}
              >
                Approve
              </motion.button>
            )}
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Print Jobs Tab ──────────────────────────────────────────────────────────
function PrintJobsTab({ jobs, onStatusChange }: { jobs: any[]; onStatusChange: (id: string, s: string) => void }) {
  if (!jobs) return <>{[1,2,3].map(i => <Skeleton key={i} />)}</>;
  if (jobs.length === 0) return <Empty icon="🖨️" text="No print jobs yet" />;
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
      {jobs.map((j, idx) => {
        const sc = PRINT_STATUS_COLORS[j.status] ?? { bg: 'var(--surface-2)', text: 'var(--text-sec)' };
        return (
          <motion.div key={j.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', flexWrap: 'wrap' }}>
            <span style={{ fontSize: '1.2rem' }}>📄</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{j.file_name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.1rem' }}>
                {j.user_name ?? j.user_id} · {j.color_mode === 'bw' ? 'B&W' : 'Color'} · {j.page_size} · {j.total_pages}pg × {j.copies} · ₹{j.amount}
              </p>
            </div>
            <Badge label={j.status} colors={sc} />
            <select
              value={j.status}
              onChange={e => onStatusChange(j.id, e.target.value)}
              style={{
                padding: '0.28rem 0.6rem', borderRadius: 'var(--r-sm)',
                border: '1.5px solid var(--border-strong)',
                background: 'var(--surface)', color: 'var(--text)',
                fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer',
              }}
            >
              {PRINT_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </motion.div>
        );
      })}
    </div>
  );
}

// ─── Products Tab ─────────────────────────────────────────────────────────────
function ProductsTab({
  products,
  onToggle,
  onEdit,
  onAdd,
  onRefresh,
}: {
  products: any[];
  onToggle: (p: any) => void;
  onEdit: (p: any) => void;
  onAdd: () => void;
  onRefresh: () => void;
}) {
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ created: number; updated: number; errors: string[] } | null>(null);
  const fileRef = React.useRef<HTMLInputElement>(null);

  const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportResult(null);
    try {
      const r = await adminApi.importProducts(file);
      setImportResult(r);
      if ((r.created || 0) + (r.updated || 0) > 0) onRefresh();
    } catch {
      setImportResult({ created: 0, updated: 0, errors: ['Upload failed — please try again'] });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  if (!products) return <>{[1,2,3].map(i => <Skeleton key={i} />)}</>;
  return (
    <>
      {/* Toolbar */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.65rem', marginBottom: '1rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          {/* Template download */}
          <a href="/api/admin/products/template?format=xlsx" target="_blank" rel="noreferrer"
            style={{ padding: '0.4rem 0.85rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-sec)', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
            📋 Template
          </a>
          {/* Export */}
          <a href="/api/admin/products/export?format=xlsx" target="_blank" rel="noreferrer"
            style={{ padding: '0.4rem 0.85rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-sec)', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ⬇ Export Excel
          </a>
          <a href="/api/admin/products/export?format=csv" target="_blank" rel="noreferrer"
            style={{ padding: '0.4rem 0.85rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-sec)', fontWeight: 700, fontSize: '0.78rem', textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '5px' }}>
            ⬇ Export CSV
          </a>
          {/* Import */}
          <input ref={fileRef} type="file" accept=".csv,.xlsx,.xls" onChange={handleImport} style={{ display: 'none' }} />
          <motion.button onClick={() => fileRef.current?.click()} disabled={importing}
            whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '0.4rem 0.85rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--emerald)', background: 'rgba(16,185,129,0.08)', color: '#047857', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            {importing ? '⏳ Importing…' : '⬆ Import CSV/Excel'}
          </motion.button>
        </div>
        <motion.button onClick={onAdd} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          style={{ padding: '0.5rem 1.2rem', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer' }}>
          + Add Product
        </motion.button>
      </div>

      {/* Import result banner */}
      <AnimatePresence>
        {importResult && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
            style={{ marginBottom: '1rem', padding: '0.85rem 1.1rem', borderRadius: 'var(--r-lg)', background: importResult.errors.length > 0 ? 'rgba(234,179,8,0.1)' : 'rgba(16,185,129,0.1)', border: `1px solid ${importResult.errors.length > 0 ? 'rgba(234,179,8,0.4)' : 'rgba(16,185,129,0.35)'}`, fontSize: '0.83rem' }}>
            <p style={{ fontWeight: 700, marginBottom: importResult.errors.length ? '0.4rem' : 0 }}>
              ✅ Import done — {importResult.created} created, {importResult.updated} updated
              {importResult.errors.length > 0 && ` · ${importResult.errors.length} error(s)`}
            </p>
            {importResult.errors.map((e, i) => <p key={i} style={{ color: '#b45309', fontSize: '0.76rem' }}>{e}</p>)}
            <button onClick={() => setImportResult(null)} style={{ marginTop: '0.35rem', background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.75rem' }}>Dismiss</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {products.map((p, idx) => (
          <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.02 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.75rem 1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', opacity: p.is_active ? 1 : 0.5, flexWrap: 'wrap' }}>
            {/* Product image thumbnail */}
            <div style={{ width: 52, height: 52, borderRadius: 'var(--r-md)', overflow: 'hidden', flexShrink: 0, background: 'var(--surface-2)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.4rem' }}>
              {p.image_url ? (
                <img src={p.image_url.startsWith('http') ? p.image_url : `http://localhost:5000${p.image_url}`} alt={p.name}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : '🛍️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.1rem' }}>
                {p.category} · ₹{parseFloat(p.price).toFixed(0)} · Stock: {p.stock}
              </p>
            </div>
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: p.is_active ? '#047857' : '#b91c1c' }}>
              {p.is_active ? 'Active' : 'Inactive'}
            </span>
            <motion.button onClick={() => onEdit(p)} whileHover={{ scale: 1.04 }}
              style={{ padding: '0.28rem 0.7rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer' }}>
              Edit
            </motion.button>
            <motion.button onClick={() => onToggle(p)} whileHover={{ scale: 1.04 }}
              style={{ padding: '0.28rem 0.7rem', borderRadius: 'var(--r-sm)', border: 'none', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', background: p.is_active ? 'rgba(239,68,68,0.1)' : 'rgba(16,185,129,0.1)', color: p.is_active ? '#b91c1c' : '#047857' }}>
              {p.is_active ? 'Deactivate' : 'Activate'}
            </motion.button>
          </motion.div>
        ))}
      </div>
    </>
  );
}

// ─── Users Tab ───────────────────────────────────────────────────────────────
function UsersTab({ users }: { users: any[] }) {
  if (!users) return <>{[1,2,3].map(i => <Skeleton key={i} />)}</>;
  if (users.length === 0) return <Empty icon="👥" text="No users yet" />;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '0.75rem' }}>
        <a
          href="/admin/users"
          style={{
            padding: '0.4rem 1rem', borderRadius: 'var(--r-pill)',
            background: 'var(--gradient-brand)', color: '#fff',
            fontSize: '0.8rem', fontWeight: 700, textDecoration: 'none',
          }}
        >
          👥 Manage Users →
        </a>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.65rem' }}>
        {users.map((u, idx) => (
          <motion.div key={u.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.03 }}
            style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
            <span style={{ fontSize: '1.2rem' }}>{u.role === 'admin' ? '🛡️' : '👤'}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem' }}>{u.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.73rem', marginTop: '0.1rem' }}>{u.email} · Wallet: ₹{parseFloat(u.wallet || 0).toFixed(0)}</p>
            </div>
            <span style={{
              padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)',
              background: u.role === 'admin' ? 'rgba(79,70,229,0.12)' : 'var(--surface-2)',
              color: u.role === 'admin' ? '#4f46e5' : 'var(--text-sec)',
              fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
            }}>
              {u.role}
            </span>
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────
function Empty({ icon, text }: { icon: string; text: string }) {
  return (
    <div style={{ padding: '2.5rem 2rem', borderRadius: 'var(--r-xl)', background: 'var(--gradient-subtle)', border: '1px dashed var(--border-brand)', textAlign: 'center' }}>
      <div style={{ fontSize: '1.8rem', marginBottom: '0.6rem' }}>{icon}</div>
      <p style={{ fontSize: '0.92rem', color: 'var(--indigo)', fontWeight: 700 }}>{text}</p>
    </div>
  );
}

// ─── Product Modal ────────────────────────────────────────────────────────────
interface ProductForm { name: string; description: string; category: string; price: string; stock: string; image_url: string; is_active: boolean }
const EMPTY_FORM: ProductForm = { name: '', description: '', category: 'Stationery', price: '', stock: '0', image_url: '', is_active: true };
const CATEGORIES = ['Stationery', 'Tech', 'Lab Supplies', 'Snacks', 'Print Media'];

function ProductModal({
  initial,
  onSave,
  onClose,
  onImageUploaded,
}: {
  initial: ProductForm | null;
  onSave: (f: ProductForm) => void;
  onClose: () => void;
  onImageUploaded?: (productId: string, newUrl: string) => void;
}) {
  const [form, setForm] = useState<ProductForm>(initial ?? EMPTY_FORM);
  const [imgFile, setImgFile] = useState<File | null>(null);
  const [imgPreview, setImgPreview] = useState<string | null>(
    (initial as any)?.image_url ? ((initial as any).image_url.startsWith('http') ? (initial as any).image_url : `http://localhost:5000${(initial as any).image_url}`) : null
  );
  const [uploading, setUploading] = useState(false);
  const imgInputRef = React.useRef<HTMLInputElement>(null);

  const set = (k: keyof ProductForm) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm(f => ({ ...f, [k]: e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value }));

  const handleImgPick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImgFile(file);
    setImgPreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    // If editing an existing product and a new image file was picked, upload it first
    if (imgFile && (initial as any)?.id) {
      setUploading(true);
      try {
        const r = await adminApi.uploadProductImage((initial as any).id, imgFile);
        if (r.success && onImageUploaded) onImageUploaded((initial as any).id, r.data.image_url);
        // Also update the form so the URL is saved on submit
        const updatedForm = { ...form, image_url: r.data.image_url };
        onSave(updatedForm);
      } catch {
        onSave(form);
      } finally {
        setUploading(false);
      }
    } else {
      onSave(form);
    }
  };

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '0.55rem 0.8rem',
    borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)',
    background: 'var(--surface)', color: 'var(--text)', fontSize: '0.88rem',
    boxSizing: 'border-box',
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000, padding: '1rem' }}>
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        style={{ width: '100%', maxWidth: 500, background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '2rem', boxShadow: 'var(--shadow-lg)', maxHeight: '90vh', overflowY: 'auto' }}
      >
        <h2 style={{ fontSize: '1.1rem', fontWeight: 800, marginBottom: '1.2rem' }}>
          {initial ? 'Edit Product' : 'Add Product'}
        </h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {/* Image picker */}
          <div>
            <p style={{ fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.4rem' }}>Product Image</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem' }}>
              <div onClick={() => imgInputRef.current?.click()}
                style={{ width: 72, height: 72, borderRadius: 'var(--r-md)', border: '2px dashed var(--border-strong)', overflow: 'hidden', cursor: 'pointer', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, fontSize: '1.6rem' }}>
                {imgPreview ? <img src={imgPreview} alt="preview" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : '📷'}
              </div>
              <div style={{ flex: 1 }}>
                <input ref={imgInputRef} type="file" accept="image/*" onChange={handleImgPick} style={{ display: 'none' }} />
                <motion.button type="button" onClick={() => imgInputRef.current?.click()} whileHover={{ scale: 1.03 }}
                  style={{ padding: '0.38rem 0.85rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontWeight: 700, fontSize: '0.78rem', cursor: 'pointer', display: 'block', marginBottom: '0.35rem' }}>
                  {imgPreview ? '🔄 Change image' : '⬆ Upload image'}
                </motion.button>
                <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  {(initial as any)?.id ? 'Or paste a URL below' : 'JPG, PNG, WebP up to 5 MB'}
                </p>
              </div>
            </div>
          </div>
          <input placeholder="Image URL (optional)" value={form.image_url} onChange={set('image_url')} style={inputStyle} />

          <input placeholder="Name *" value={form.name} onChange={set('name')} style={inputStyle} />
          <textarea placeholder="Description" value={form.description} onChange={set('description')} rows={2}
            style={{ ...inputStyle, resize: 'vertical', fontFamily: 'inherit' }} />
          <select value={form.category} onChange={set('category')} style={inputStyle}>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <input placeholder="Price *" type="number" min="0" value={form.price} onChange={set('price')} style={{ ...inputStyle, flex: 1 }} />
            <input placeholder="Stock" type="number" min="0" value={form.stock} onChange={set('stock')} style={{ ...inputStyle, flex: 1 }} />
          </div>
          {initial && (
            <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.88rem', fontWeight: 600 }}>
              <input type="checkbox" checked={form.is_active} onChange={set('is_active')} />
              Active
            </label>
          )}
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
          <motion.button onClick={onClose} whileHover={{ scale: 1.03 }}
            style={{ padding: '0.5rem 1.2rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer' }}>
            Cancel
          </motion.button>
          <motion.button onClick={handleSave} disabled={uploading} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
            style={{ padding: '0.5rem 1.4rem', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: '0.85rem', border: 'none', cursor: 'pointer', opacity: uploading ? 0.7 : 1 }}>
            {uploading ? 'Saving…' : 'Save'}
          </motion.button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Printers Tab ────────────────────────────────────────────────────────────
const PRINTER_STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  active:      { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
  inactive:    { bg: 'rgba(107,114,128,0.12)', text: '#6b7280' },
  error:       { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
  maintenance: { bg: 'rgba(234,179,8,0.14)',   text: '#92400e' },
};
const CAP_LABEL: Record<string, string> = { bw: 'B&W', color: 'Color', both: 'B&W + Color' };
function PrinterIcon({ status }: { status: string }) {
  if (status === 'active')      return <>🟢</>;
  if (status === 'maintenance') return <>🔧</>;
  if (status === 'error')       return <>🔴</>;
  return <>⚫</>;
}

function PrintersTab({ printers, onToggle, onDelete, onAdd }: {
  printers: any[];
  onToggle: (id: string, status: string) => void;
  onDelete: (id: string, name: string) => void;
  onAdd: () => void;
}) {
  const [openQueue, setOpenQueue] = useState<string | null>(null);
  const [queueData, setQueueData] = useState<Record<string, any[]>>({});
  const [queueLoading, setQueueLoading] = useState<string | null>(null);
  const [reassigning, setReassigning] = useState<string | null>(null);

  const fetchQueue = async (printerId: string) => {
    if (openQueue === printerId) { setOpenQueue(null); return; }
    setQueueLoading(printerId);
    try {
      const r = await fetch(`/api/admin/printers/${printerId}/queue`, { credentials: 'include' });
      const d = await r.json();
      setQueueData(prev => ({ ...prev, [printerId]: d.data || [] }));
    } catch { setQueueData(prev => ({ ...prev, [printerId]: [] })); }
    setQueueLoading(null);
    setOpenQueue(printerId);
  };

  const handleReassign = async (jobId: string, newPrinterId: string) => {
    setReassigning(jobId);
    try {
      await fetch(`/api/admin/print-jobs/${jobId}/reassign`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ printerId: newPrinterId }),
      });
      // Refresh all open queues
      if (openQueue) fetchQueue(openQueue);
    } catch {}
    setReassigning(null);
  };

  if (!printers) return <>{[1,2,3].map(i => <Skeleton key={i} />)}</>;
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.1rem' }}>
        <p style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-sec)' }}>{printers.length} printer{printers.length !== 1 ? 's' : ''}</p>
        <motion.button onClick={onAdd} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
          style={{ padding: '0.4rem 1.1rem', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: '0.82rem', border: 'none', cursor: 'pointer' }}>
          + Add Printer
        </motion.button>
      </div>
      {printers.length === 0 && <Empty icon="🖥️" text="No printers added yet" />}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
        {printers.map((p, idx) => {
          const sc = PRINTER_STATUS_COLORS[p.status] ?? PRINTER_STATUS_COLORS['inactive'];
          const jobs = queueData[p.id] || [];
          return (
            <motion.div key={p.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.04 }}
              style={{ borderRadius: 'var(--r-xl)', background: 'var(--surface)', border: `1.5px solid ${p.status === 'active' ? 'rgba(16,185,129,0.2)' : p.status === 'maintenance' ? 'rgba(234,179,8,0.3)' : 'var(--border)'}`, overflow: 'hidden' }}>
              {/* Printer row */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.9rem', padding: '0.9rem 1rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '1.1rem' }}><PrinterIcon status={p.status} /></span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</p>
                  <p style={{ color: 'var(--text-muted)', fontSize: '0.72rem', marginTop: '0.1rem' }}>
                    {CAP_LABEL[p.capabilities] ?? p.capabilities}
                    {p.location && <span style={{ marginLeft: '0.5rem' }}>· 📍 {p.location}</span>}
                    {p.jobs_done > 0 && <span style={{ marginLeft: '0.5rem', color: 'var(--indigo)' }}>· {p.jobs_done} jobs done</span>}
                    {(p.queue_depth ?? 0) > 0 && <span style={{ marginLeft: '0.5rem', color: '#d97706' }}>· {p.queue_depth} in queue</span>}
                  </p>
                </div>
                <Badge label={p.status} colors={sc} />
                {/* Quick maintenance toggle */}
                {p.status !== 'maintenance' ? (
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => onToggle(p.id, 'maintenance')} title="Set maintenance mode"
                    style={{ padding: '0.28rem 0.65rem', borderRadius: 'var(--r-sm)', background: 'rgba(234,179,8,0.1)', color: '#92400e', fontWeight: 700, fontSize: '0.75rem', border: '1px solid rgba(234,179,8,0.3)', cursor: 'pointer' }}>
                    🔧 Maintenance
                  </motion.button>
                ) : (
                  <motion.button whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                    onClick={() => onToggle(p.id, 'active')} title="Set active"
                    style={{ padding: '0.28rem 0.65rem', borderRadius: 'var(--r-sm)', background: 'rgba(16,185,129,0.1)', color: '#047857', fontWeight: 700, fontSize: '0.75rem', border: '1px solid rgba(16,185,129,0.3)', cursor: 'pointer' }}>
                    ▶ Set Active
                  </motion.button>
                )}
                <select
                  value={p.status}
                  onChange={e => onToggle(p.id, e.target.value)}
                  style={{ padding: '0.28rem 0.6rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.78rem', fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                >
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="error">Error</option>
                  <option value="maintenance">Maintenance</option>
                </select>
                <motion.button onClick={() => fetchQueue(p.id)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.96 }}
                  style={{ padding: '0.28rem 0.65rem', borderRadius: 'var(--r-sm)', background: 'rgba(79,70,229,0.1)', color: 'var(--indigo)', fontWeight: 700, fontSize: '0.75rem', border: '1px solid rgba(79,70,229,0.2)', cursor: 'pointer' }}>
                  {queueLoading === p.id ? '…' : openQueue === p.id ? '▲ Queue' : `▼ Queue${(p.queue_depth ?? 0) > 0 ? ` (${p.queue_depth})` : ''}`}
                </motion.button>
                <motion.button onClick={() => onDelete(p.id, p.name)} whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  title="Remove printer"
                  style={{ padding: '0.3rem 0.65rem', borderRadius: 'var(--r-sm)', background: 'rgba(239,68,68,0.1)', color: '#b91c1c', fontWeight: 700, fontSize: '0.8rem', border: 'none', cursor: 'pointer' }}>
                  🗑
                </motion.button>
              </div>

              {/* Per-printer queue panel */}
              <AnimatePresence>
                {openQueue === p.id && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    style={{ overflow: 'hidden', borderTop: '1px solid var(--border)', background: 'var(--surface-2)' }}
                  >
                    <div style={{ padding: '1rem 1.1rem' }}>
                      <p style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--indigo)', marginBottom: '0.75rem' }}>
                        Queue — {jobs.length} job{jobs.length !== 1 ? 's' : ''}
                      </p>
                      {jobs.length === 0 ? (
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>No active jobs assigned.</p>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                          {jobs.map((job: any) => (
                            <div key={job.id} style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <p style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.file_name}</p>
                                <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)', marginTop: '0.1rem' }}>
                                  {job.user_name} · {job.color_mode === 'bw' ? 'B&W' : 'Color'} {job.page_size} · {job.total_pages}pg × {job.copies}
                                  {job.notes ? ` · "${job.notes.slice(0,30)}…"` : ''}
                                </p>
                              </div>
                              <Badge label={job.status} colors={PRINT_STATUS_COLORS[job.status] ?? { bg: 'var(--surface-2)', text: 'var(--text-sec)' }} />
                              {/* Reassign to another printer */}
                              <select
                                disabled={reassigning === job.id}
                                defaultValue=""
                                onChange={e => { if (e.target.value) handleReassign(job.id, e.target.value); e.target.value = ''; }}
                                style={{ padding: '0.25rem 0.5rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontSize: '0.75rem', cursor: 'pointer', fontFamily: 'var(--font-body)' }}
                              >
                                <option value="">Reassign →</option>
                                {printers.filter(pr => pr.id !== p.id).map(pr => (
                                  <option key={pr.id} value={pr.id}>{pr.name}</option>
                                ))}
                              </select>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Coupons Tab ─────────────────────────────────────────────────────────────
function CouponsTab() {
  const [coupons,  setCoupons]  = useState<any[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [error,    setError]    = useState('');
  const [creating, setCreating] = useState(false);
  const [form, setForm] = useState({
    code: '', type: 'percent' as 'percent' | 'fixed', value: '',
    min_order: '', max_discount: '', max_uses: '', expires_at: '',
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await couponsApi.adminList() as { data: any[] };
      setCoupons(r.data ?? []);
    } catch { setCoupons([]); }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.value) return;
    setError('');
    try {
      await couponsApi.adminCreate({
        code:         form.code.trim().toUpperCase(),
        type:         form.type,
        value:        parseFloat(form.value),
        min_order:    form.min_order    ? parseFloat(form.min_order)    : undefined,
        max_discount: form.max_discount ? parseFloat(form.max_discount) : undefined,
        max_uses:     form.max_uses     ? parseInt(form.max_uses)       : undefined,
        expires_at:   form.expires_at   || undefined,
      });
      setForm({ code: '', type: 'percent', value: '', min_order: '', max_discount: '', max_uses: '', expires_at: '' });
      setCreating(false);
      load();
    } catch (err: any) { setError(err?.message || 'Failed to create coupon'); }
  };

  const handleToggle = async (id: string) => {
    try { await couponsApi.adminToggle(id); load(); } catch {}
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this coupon?')) return;
    try { await couponsApi.adminDelete(id); load(); } catch {}
  };

  const inputStyle: React.CSSProperties = {
    padding: '0.5rem 0.8rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)',
    background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.85rem', fontFamily: 'var(--font-body)', width: '100%',
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontWeight: 900, fontSize: '1.1rem' }}>🏷️ Coupons</h2>
        <button onClick={() => setCreating(v => !v)}
          style={{ padding: '0.5rem 1.2rem', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>
          {creating ? '✕ Cancel' : '+ New Coupon'}
        </button>
      </div>

      {creating && (
        <motion.form onSubmit={handleCreate} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-lg)', padding: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <h3 style={{ fontWeight: 800, marginBottom: '0.25rem' }}>Create Coupon</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '0.75rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Code *</label>
              <input required value={form.code} onChange={e => setForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="PROMO10" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Type *</label>
              <select value={form.type} onChange={e => setForm(f => ({ ...f, type: e.target.value as 'percent' | 'fixed' }))} style={inputStyle}>
                <option value="percent">% Percent</option>
                <option value="fixed">₹ Fixed</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Value *</label>
              <input required type="number" min={0} value={form.value} onChange={e => setForm(f => ({ ...f, value: e.target.value }))} placeholder={form.type === 'percent' ? '10' : '20'} style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Min Order (₹)</label>
              <input type="number" min={0} value={form.min_order} onChange={e => setForm(f => ({ ...f, min_order: e.target.value }))} placeholder="0" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Max Discount (₹)</label>
              <input type="number" min={0} value={form.max_discount} onChange={e => setForm(f => ({ ...f, max_discount: e.target.value }))} placeholder="—" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Max Uses</label>
              <input type="number" min={1} value={form.max_uses} onChange={e => setForm(f => ({ ...f, max_uses: e.target.value }))} placeholder="unlimited" style={inputStyle} />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.72rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase' }}>Expires At</label>
              <input type="date" value={form.expires_at} onChange={e => setForm(f => ({ ...f, expires_at: e.target.value }))} style={inputStyle} />
            </div>
          </div>
          {error && <p style={{ color: '#ef4444', fontSize: '0.82rem' }}>{error}</p>}
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button type="submit" style={{ padding: '0.6rem 1.4rem', borderRadius: 'var(--r-pill)', border: 'none', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>Create</button>
            <button type="button" onClick={() => setCreating(false)} style={{ padding: '0.6rem 1.2rem', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer' }}>Cancel</button>
          </div>
        </motion.form>
      )}

      {loading ? (
        <>{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} h={44} />)}</>
      ) : coupons.length === 0 ? (
        <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>No coupons yet.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid var(--border)', color: 'var(--text-muted)', fontWeight: 700, fontSize: '0.72rem', textTransform: 'uppercase' }}>
                {['Code','Type','Value','Min Order','Max Disc.','Uses','Expires','Status','Actions'].map(h => (
                  <th key={h} style={{ padding: '0.5rem 0.75rem', textAlign: 'left' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {coupons.map((c: any) => (
                <tr key={c.id} style={{ borderBottom: '1px solid var(--border)' }}>
                  <td style={{ padding: '0.7rem 0.75rem', fontWeight: 800, fontFamily: 'var(--font-heading)' }}>{c.code}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>{c.type === 'percent' ? '%' : '₹'}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>{c.type === 'percent' ? `${c.value}%` : `₹${c.value}`}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>{c.min_order ? `₹${c.min_order}` : '—'}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>{c.max_discount ? `₹${c.max_discount}` : '—'}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>{c.used_count}/{c.max_uses ?? '∞'}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>{c.expires_at ? new Date(c.expires_at).toLocaleDateString() : '—'}</td>
                  <td style={{ padding: '0.7rem 0.75rem' }}>
                    <span style={{ padding: '2px 10px', borderRadius: 'var(--r-pill)', background: c.is_active ? 'rgba(22,163,74,0.12)' : 'rgba(239,68,68,0.12)', color: c.is_active ? '#16a34a' : '#dc2626', fontSize: '0.72rem', fontWeight: 700 }}>
                      {c.is_active ? 'Active' : 'Off'}
                    </span>
                  </td>
                  <td style={{ padding: '0.7rem 0.75rem', display: 'flex', gap: '0.5rem' }}>
                    <button onClick={() => handleToggle(c.id)}
                      style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', border: '1px solid var(--border-strong)', background: 'var(--surface)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                      {c.is_active ? 'Disable' : 'Enable'}
                    </button>
                    <button onClick={() => handleDelete(c.id)}
                      style={{ padding: '3px 10px', borderRadius: 'var(--r-pill)', border: '1px solid var(--rose)', background: 'rgba(239,68,68,0.07)', color: 'var(--rose)', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 700 }}>
                      Del
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

// ─── Settings Tab ─────────────────────────────────────────────────────────────
const SETTINGS_SECTIONS = [
  {
    title: '🗄️ Database',
    keys: ['DB_HOST', 'DB_PORT', 'DB_NAME', 'DB_USER', 'DB_PASSWORD'],
    secret: ['DB_PASSWORD'],
    note: 'Restart the backend server after changing DB settings.',
  },
  {
    title: '🔐 Security',
    keys: ['JWT_SECRET', 'JWT_EXPIRES_IN', 'PRINT_CLIENT_API_KEY'],
    secret: ['JWT_SECRET', 'PRINT_CLIENT_API_KEY'],
    note: 'JWT changes apply to new tokens only. Existing sessions remain valid until expiry.',
  },
  {
    title: '💳 Cashfree Payment Gateway',
    keys: ['CASHFREE_APP_ID', 'CASHFREE_SECRET_KEY', 'CASHFREE_ENV'],
    secret: ['CASHFREE_SECRET_KEY'],
    note: 'Set CASHFREE_ENV to SANDBOX for testing, PRODUCTION for live payments.',
  },
  {
    title: '🌐 App URLs',
    keys: ['FRONTEND_URL', 'BACKEND_URL', 'PORT', 'NODE_ENV'],
    secret: [],
    note: 'Change these if you move to a different server or domain.',
  },
];

const FIELD_LABELS: Record<string, string> = {
  DB_HOST: 'DB Host', DB_PORT: 'DB Port', DB_NAME: 'DB Name',
  DB_USER: 'DB User', DB_PASSWORD: 'DB Password',
  JWT_SECRET: 'JWT Secret', JWT_EXPIRES_IN: 'JWT Expiry (e.g. 7d)',
  PRINT_CLIENT_API_KEY: 'Print Client API Key',
  CASHFREE_APP_ID: 'Cashfree App ID', CASHFREE_SECRET_KEY: 'Cashfree Secret Key',
  CASHFREE_ENV: 'Cashfree Environment',
  FRONTEND_URL: 'Frontend URL', BACKEND_URL: 'Backend URL',
  PORT: 'Backend Port', NODE_ENV: 'Node Environment',
};

function SettingsTab() {
  const [values, setValues]     = useState<Record<string, string>>({});
  const [show,   setShow]       = useState<Record<string, boolean>>({});
  const [loading, setLoading]   = useState(true);
  const [saving,  setSaving]    = useState(false);
  const [toast,   setToast]     = useState<{ msg: string; ok: boolean } | null>(null);

  useEffect(() => {
    adminApi.getSettings().then((r: any) => {
      setValues(r.settings ?? {});
    }).catch(() => {
      setToast({ msg: 'Failed to load settings', ok: false });
    }).finally(() => setLoading(false));
  }, []);

  const handleSave = async (keys: string[]) => {
    setSaving(true);
    const patch: Record<string, string> = {};
    for (const k of keys) patch[k] = values[k] ?? '';
    try {
      await adminApi.saveSettings(patch);
      setToast({ msg: 'Saved! DB changes require a backend restart.', ok: true });
    } catch {
      setToast({ msg: 'Save failed', ok: false });
    } finally {
      setSaving(false);
      setTimeout(() => setToast(null), 4000);
    }
  };

  if (loading) return <div style={{ padding: '2rem', color: 'var(--fg-muted)' }}>Loading settings…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      {toast && (
        <div style={{ padding: '0.75rem 1.25rem', borderRadius: 'var(--r-lg)', fontWeight: 600, fontSize: '0.9rem',
          background: toast.ok ? 'rgba(16,185,129,0.12)' : 'rgba(239,68,68,0.12)',
          color: toast.ok ? '#047857' : '#b91c1c', border: `1px solid ${toast.ok ? '#a7f3d0' : '#fca5a5'}` }}>
          {toast.msg}
        </div>
      )}
      {SETTINGS_SECTIONS.map(section => (
        <div key={section.title}
          style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--r-xl)', padding: '1.5rem' }}>
          <h3 style={{ margin: '0 0 0.25rem', fontWeight: 800, fontSize: '1rem' }}>{section.title}</h3>
          {section.note && (
            <p style={{ margin: '0 0 1.25rem', fontSize: '0.82rem', color: 'var(--fg-muted)' }}>{section.note}</p>
          )}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
            {section.keys.map(key => {
              const isSecret = section.secret.includes(key);
              const isVisible = !isSecret || show[key];
              return (
                <div key={key}>
                  <label style={{ display: 'block', fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.35rem', color: 'var(--fg-muted)' }}>
                    {FIELD_LABELS[key] ?? key}
                  </label>
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <input
                      type={isVisible ? 'text' : 'password'}
                      value={values[key] ?? ''}
                      onChange={e => setValues(v => ({ ...v, [key]: e.target.value }))}
                      style={{ flex: 1, padding: '0.55rem 0.75rem', borderRadius: 'var(--r-lg)',
                        border: '1px solid var(--border)', background: 'var(--surface-2)',
                        fontSize: '0.88rem', fontFamily: isSecret ? 'monospace' : 'inherit', outline: 'none' }}
                    />
                    {isSecret && (
                      <button onClick={() => setShow(s => ({ ...s, [key]: !s[key] }))}
                        style={{ padding: '0 0.6rem', borderRadius: 'var(--r-lg)', border: '1px solid var(--border)',
                          background: 'var(--surface-2)', cursor: 'pointer', fontSize: '0.9rem' }}>
                        {show[key] ? '🙈' : '👁️'}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
          <button
            onClick={() => handleSave(section.keys)}
            disabled={saving}
            style={{ marginTop: '1.25rem', padding: '0.55rem 1.25rem', borderRadius: 'var(--r-pill)',
              background: 'var(--indigo)', color: '#fff', border: 'none', fontWeight: 700,
              fontSize: '0.88rem', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1 }}>
            {saving ? 'Saving…' : 'Save Section'}
          </button>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [tab, setTab]           = useState<Tab>('stats');
  const [stats, setStats]       = useState<any>(null);
  const [analytics, setAnalytics] = useState<any>(null);
  const [analyticsDays, setAnalyticsDays] = useState(30);
  const [orders, setOrders]     = useState<any[]>([]);
  const [printJobs, setPrintJobs] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [users, setUsers]       = useState<any[]>([]);
  const [printers, setPrinters] = useState<any[]>([]);
  const [toast, setToast]       = useState<string | null>(null);
  const [productModal, setProductModal] = useState<{ open: boolean; data: any | null }>({ open: false, data: null });
  const [printerModal, setPrinterModal] = useState(false);
  const [newPrinter, setNewPrinter]     = useState({ name: '', capabilities: 'bw', location: '' });

  useEffect(() => {
    if (!loading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, loading, router]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadAnalytics = useCallback(async (d: number) => {
    try {
      const r = await adminApi.analytics(d);
      setAnalytics(r);
    } catch { /* non-fatal */ }
  }, []);

  const handleDaysChange = useCallback((d: number) => {
    setAnalyticsDays(d);
    setAnalytics(null);
    loadAnalytics(d);
  }, [loadAnalytics]);

  const loadData = useCallback(async (t: Tab, days = 30) => {
    try {
      if (t === 'stats')    { const r = await adminApi.stats();     setStats(r); loadAnalytics(days); }
      if (t === 'orders')   { const r = await adminApi.orders();    setOrders(r.orders || []); }
      if (t === 'print')    { const r = await adminApi.printJobs(); setPrintJobs(r.data || []); }
      if (t === 'products') { const r = await adminApi.products();  setProducts(r.data || []); }
      if (t === 'users')    { const r = await adminApi.users();     setUsers(r.data || []); }
      if (t === 'printers') { const r = await adminApi.printers();  setPrinters(r.data || []); }
    } catch (e: any) {
      showToast(e?.message || 'Failed to load');
    }
  }, [loadAnalytics]);

  useEffect(() => { if (user?.role === 'admin') loadData(tab, analyticsDays); }, [tab, user]); // eslint-disable-line

  const handleApproveOrder = async (id: string) => {
    try {
      await ordersApi.approveOrder(id);
      showToast('Order approved ✅');
      loadData('orders');
    } catch { showToast('Approval failed'); }
  };

  const handleDeliveryStatus = async (id: string, status: string) => {
    try {
      await adminApi.updateOrderStatus(id, status);
      setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
      showToast(`Delivery status → ${status}`);
    } catch { showToast('Status update failed'); }
  };

  const handlePrinterStatus = async (id: string, status: string) => {
    try {
      await adminApi.updatePrinterStatus(id, status);
      setPrinters(prev => prev.map(p => p.id === id ? { ...p, status } : p));
      showToast(`Printer ${status}`);
    } catch { showToast('Printer update failed'); }
  };

  const handleDeletePrinter = async (id: string, name: string) => {
    try {
      await adminApi.deletePrinter(id);
      setPrinters(prev => prev.filter(p => p.id !== id));
      showToast(`${name} removed`);
    } catch { showToast('Delete failed'); }
  };

  const handleAddPrinter = async () => {
    if (!newPrinter.name.trim()) { showToast('Enter a printer name'); return; }
    try {
      const r = await adminApi.createPrinter(newPrinter.name.trim(), newPrinter.capabilities, newPrinter.location.trim() || undefined);
      setPrinters(prev => [...prev, r.data]);
      setNewPrinter({ name: '', capabilities: 'bw', location: '' });
      setPrinterModal(false);
      showToast(`${r.data.name} added ✅`);
    } catch { showToast('Failed to add printer'); }
  };

  const handlePrintStatus = async (id: string, status: string) => {
    try {
      await adminApi.updatePrintStatus(id, status);
      setPrintJobs(prev => prev.map(j => j.id === id ? { ...j, status } : j));
      showToast(`Status updated → ${status}`);
    } catch { showToast('Update failed'); }
  };

  const handleToggleProduct = async (p: any) => {
    try {
      if (p.is_active) {
        await adminApi.deactivateProduct(p.id);
        showToast(`${p.name} deactivated`);
      } else {
        await adminApi.updateProduct(p.id, { is_active: true });
        showToast(`${p.name} activated`);
      }
      loadData('products');
    } catch { showToast('Update failed'); }
  };

  const handleSaveProduct = async (form: ProductForm) => {
    try {
      if (productModal.data) {
        await adminApi.updateProduct(productModal.data.id, {
          name: form.name, description: form.description || null,
          category: form.category, price: parseFloat(form.price),
          stock: parseInt(form.stock), image_url: form.image_url || null,
          is_active: form.is_active,
        });
        showToast('Product updated ✅');
      } else {
        await adminApi.createProduct({
          name: form.name, description: form.description || null,
          category: form.category, price: parseFloat(form.price),
          stock: parseInt(form.stock), image_url: form.image_url || null,
        });
        showToast('Product created ✅');
      }
      setProductModal({ open: false, data: null });
      loadData('products');
    } catch (e: any) { showToast(e?.error || 'Save failed'); }
  };

  if (loading || !user) return null;
  if (user.role !== 'admin') return null;

  return (
    <div style={{ maxWidth: '1200px', margin: '0 auto', padding: 'clamp(2rem, 4vw, 3.5rem) clamp(1.5rem, 4vw, 3rem)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: '2rem' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '0.4rem' }}>
          ADMIN
        </p>
        <h1 style={{ fontSize: 'clamp(1.8rem, 3vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>
          Control Panel 🛡️
        </h1>
        <p style={{ color: 'var(--text-sec)', marginTop: '0.4rem', fontSize: '0.9rem' }}>
          Manage orders, print jobs, products, and users.
        </p>
      </motion.div>

      {/* Tabs */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }}
        style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '2rem', borderBottom: '1px solid var(--border)', paddingBottom: '0' }}>
        {TABS.map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: '0.4rem',
              padding: '0.55rem 1.1rem',
              borderRadius: 'var(--r-sm) var(--r-sm) 0 0',
              border: 'none', cursor: 'pointer',
              fontWeight: 700, fontSize: '0.85rem',
              background: tab === t.id ? 'var(--surface)' : 'transparent',
              color: tab === t.id ? 'var(--indigo)' : 'var(--text-sec)',
              borderBottom: tab === t.id ? '2px solid var(--indigo)' : '2px solid transparent',
              transition: 'color 0.15s',
            }}
          >
            <span>{t.icon}</span> {t.label}
          </button>
        ))}
      </motion.div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        <motion.div key={tab} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }} transition={{ duration: 0.2 }}>
          {tab === 'stats'    && <StatsTab stats={stats} analytics={analytics} days={analyticsDays} onDaysChange={handleDaysChange} />}
          {tab === 'orders'   && <OrdersTab orders={orders} onApprove={handleApproveOrder} onDeliveryStatus={handleDeliveryStatus} />}
          {tab === 'print'    && <PrintJobsTab jobs={printJobs} onStatusChange={handlePrintStatus} />}
          {tab === 'products' && (
            <ProductsTab
              products={products}
              onToggle={handleToggleProduct}
              onEdit={p => setProductModal({ open: true, data: p })}
              onAdd={() => setProductModal({ open: true, data: null })}
              onRefresh={() => loadData('products')}
            />
          )}
          {tab === 'printers' && (
            <PrintersTab
              printers={printers}
              onToggle={handlePrinterStatus}
              onDelete={handleDeletePrinter}
              onAdd={() => setPrinterModal(true)}
            />
          )}
          {tab === 'users'    && <UsersTab users={users} />}
          {tab === 'coupons'  && <CouponsTab />}
          {tab === 'settings' && <SettingsTab />}
        </motion.div>
      </AnimatePresence>

      {/* Add Printer Modal */}
      <AnimatePresence>
        {printerModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}
            onClick={() => setPrinterModal(false)}>
            <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
              onClick={e => e.stopPropagation()}
              style={{ background: 'var(--surface)', borderRadius: 'var(--r-xl)', padding: '2rem', width: '100%', maxWidth: 400 }}>
              <h3 style={{ margin: '0 0 1.25rem', fontWeight: 800, fontSize: '1.1rem' }}>Add Printer</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <input
                  placeholder="Printer name (e.g. HP LaserJet 1)"
                  value={newPrinter.name}
                  onChange={e => setNewPrinter(p => ({ ...p, name: e.target.value }))}
                  style={{ padding: '0.6rem 0.9rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' }}
                />
                <select
                  value={newPrinter.capabilities}
                  onChange={e => setNewPrinter(p => ({ ...p, capabilities: e.target.value }))}
                  style={{ padding: '0.6rem 0.9rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                >
                  <option value="bw">B&W only</option>
                  <option value="color">Color only</option>
                  <option value="both">B&W + Color</option>
                </select>
                <input
                  placeholder="Location (e.g. Block A, Room 101)"
                  value={newPrinter.location}
                  onChange={e => setNewPrinter(p => ({ ...p, location: e.target.value }))}
                  style={{ padding: '0.6rem 0.9rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', color: 'var(--text-pri)', fontSize: '0.9rem', fontFamily: 'var(--font-body)', outline: 'none', width: '100%', boxSizing: 'border-box' as const }}
                />
                <div style={{ display: 'flex', gap: '0.65rem', marginTop: '0.25rem' }}>
                  <motion.button onClick={handleAddPrinter} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: '0.55rem', borderRadius: 'var(--r-pill)', background: 'linear-gradient(135deg, #4f46e5, #7c3aed)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: 'pointer' }}>Add</motion.button>
                  <motion.button onClick={() => setPrinterModal(false)} whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    style={{ flex: 1, padding: '0.55rem', borderRadius: 'var(--r-pill)', background: 'var(--surface-2)', color: 'var(--text-sec)', fontWeight: 700, fontSize: '0.88rem', border: 'none', cursor: 'pointer' }}>Cancel</motion.button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {productModal.open && (
          <ProductModal
            initial={productModal.data ? {
              ...(productModal.data.id ? { id: productModal.data.id } : {}),
              name: productModal.data.name, description: productModal.data.description ?? '',
              category: productModal.data.category, price: productModal.data.price,
              stock: String(productModal.data.stock), image_url: productModal.data.image_url ?? '',
              is_active: productModal.data.is_active,
            } as any : null}
            onSave={handleSaveProduct}
            onClose={() => setProductModal({ open: false, data: null })}
            onImageUploaded={(_id, newUrl) => {
              setProducts(prev => prev.map(p => p.id === _id ? { ...p, image_url: newUrl } : p));
            }}
          />
        )}
      </AnimatePresence>

      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
            style={{
              position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
              padding: '0.65rem 1.4rem', borderRadius: 'var(--r-pill)',
              background: 'linear-gradient(135deg, #1e1b4b, #2e1065)',
              color: '#fff', fontWeight: 700, fontSize: '0.88rem',
              boxShadow: '0 8px 32px rgba(0,0,0,0.3)', zIndex: 2000, whiteSpace: 'nowrap',
            }}
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

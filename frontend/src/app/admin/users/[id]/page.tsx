'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { adminUsersApi } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function Avatar({ name, size = 56 }: { name: string; size?: number }) {
  const initial = name.trim().charAt(0).toUpperCase();
  const hue = (name.charCodeAt(0) * 37) % 360;
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%', flexShrink: 0,
      background: `hsl(${hue},55%,60%)`, display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      fontWeight: 800, fontSize: size * 0.42, color: '#fff',
    }}>{initial}</div>
  );
}

function StatCard({ icon, label, value }: { icon: string; label: string; value: string }) {
  return (
    <div style={{
      flex: '1 1 130px', padding: '1rem 1.2rem', borderRadius: 'var(--r-xl)',
      background: 'var(--surface)', border: '1.5px solid var(--border)',
      textAlign: 'center',
    }}>
      <div style={{ fontSize: '1.5rem', marginBottom: '0.3rem' }}>{icon}</div>
      <div style={{ fontWeight: 800, fontSize: '1.2rem' }}>{value}</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>{label}</div>
    </div>
  );
}

const ORDER_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:    { bg: 'rgba(234,179,8,0.12)',   text: '#b45309' },
  processing: { bg: 'rgba(124,58,237,0.12)',  text: '#6d28d9' },
  dispatched: { bg: 'rgba(59,130,246,0.12)',  text: '#1d4ed8' },
  delivered:  { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
  cancelled:  { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
};

const PRINT_STATUS_COLOR: Record<string, { bg: string; text: string }> = {
  pending:    { bg: 'rgba(234,179,8,0.12)',   text: '#b45309' },
  paid:       { bg: 'rgba(59,130,246,0.12)',  text: '#1d4ed8' },
  processing: { bg: 'rgba(124,58,237,0.12)',  text: '#6d28d9' },
  printed:    { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
  ready:      { bg: 'rgba(16,185,129,0.18)',  text: '#065f46' },
  failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
};

function StatusBadge({ status, map }: { status: string; map: Record<string, { bg: string; text: string }> }) {
  const cfg = map[status] ?? { bg: 'var(--surface-2)', text: 'var(--text-sec)' };
  return (
    <span style={{
      padding: '0.15rem 0.6rem', borderRadius: 'var(--r-pill)',
      background: cfg.bg, color: cfg.text,
      fontSize: '0.72rem', fontWeight: 700, textTransform: 'capitalize',
    }}>{status}</span>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUserDetailPage({ params }: { params: { id: string } }) {
  const { user: me, loading: authLoading } = useAuth();
  const router = useRouter();

  const [data,    setData]    = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [acting,  setActing]  = useState(false);
  const [roleInput, setRoleInput] = useState<'customer' | 'admin'>('customer');
  const [rolePanel, setRolePanel] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!authLoading && (!me || me.role !== 'admin')) router.replace('/dashboard');
  }, [me, authLoading, router]);

  // Fetch user
  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const res = await adminUsersApi.getById(params.id);
        setData(res.data);
        setRoleInput(res.data.user.role);
      } catch (err: any) {
        if (err?.status === 404) setNotFound(true);
      } finally {
        setLoading(false);
      }
    })();
  }, [params.id]);

  const toggleBan = async () => {
    if (!data) return;
    const isBanned = data.user.is_banned;
    if (!isBanned && !confirm(`Ban ${data.user.name}? They won't be able to use College Corner.`)) return;
    setActing(true);
    try {
      if (isBanned) await adminUsersApi.unban(params.id);
      else          await adminUsersApi.ban(params.id);
      const res = await adminUsersApi.getById(params.id);
      setData(res.data);
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    } finally {
      setActing(false);
    }
  };

  const changeRole = async () => {
    if (!data) return;
    setActing(true);
    try {
      await adminUsersApi.updateRole(params.id, roleInput);
      const res = await adminUsersApi.getById(params.id);
      setData(res.data);
      setRolePanel(false);
    } catch (err: any) {
      alert(err?.message || 'Failed to update role');
    } finally {
      setActing(false);
    }
  };

  // ─── Loading ────────────────────────────────────────────────────────────
  if (authLoading || !me) return null;
  if (loading) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ width: 40, height: 40, border: '3px solid var(--indigo)', borderTopColor: 'transparent', borderRadius: '50%', animation: 'spin 0.7s linear infinite' }} />
      </div>
    );
  }
  if (notFound || !data) {
    return (
      <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginTop: '4rem' }}>👤</div>
        <p style={{ fontWeight: 700, marginTop: '1rem' }}>User not found</p>
        <button onClick={() => router.back()} style={{ marginTop: '1rem', padding: '0.5rem 1.2rem', borderRadius: 'var(--r-pill)', background: 'var(--indigo)', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
          ← Back
        </button>
      </div>
    );
  }

  const { user: u, stats, recentOrders, recentPrints } = data;
  const joinedDate = new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });

  // ─── Render ────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 820, margin: '0 auto' }}>

        {/* Breadcrumb */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <a href="/admin" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none' }}>Admin</a>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <a href="/admin/users" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none' }}>Users</a>
          <span style={{ color: 'var(--text-muted)' }}>›</span>
          <span style={{ color: 'var(--indigo)', fontSize: '0.82rem', fontWeight: 600 }}>{u.name}</span>
        </div>

        {/* Profile card */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            padding: '1.5rem', borderRadius: 'var(--r-xl)',
            background: 'var(--surface)', border: `2px solid ${u.is_banned ? 'rgba(239,68,68,0.3)' : 'var(--border)'}`,
            marginBottom: '1.25rem',
          }}
        >
          {u.is_banned && (
            <div style={{
              padding: '0.5rem 1rem', borderRadius: 'var(--r-lg)',
              background: 'rgba(239,68,68,0.1)', color: '#b91c1c',
              fontSize: '0.83rem', fontWeight: 700, marginBottom: '1rem',
            }}>
              🚫 This account is currently suspended
            </div>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem', flexWrap: 'wrap' }}>
            <Avatar name={u.name} size={56} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                {u.name}
              </h1>
              <p style={{ color: 'var(--text-sec)', fontSize: '0.85rem' }}>{u.email}</p>
              {u.phone && <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem' }}>{u.phone}</p>}
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{
                  padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)',
                  background: u.role === 'admin' ? 'rgba(79,70,229,0.12)' : 'rgba(16,185,129,0.12)',
                  color: u.role === 'admin' ? '#4338ca' : '#047857',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>
                  {u.role === 'admin' ? '⭐ Admin' : '👤 Customer'}
                </span>
                <span style={{
                  padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)',
                  background: 'rgba(16,185,129,0.08)', color: '#047857',
                  fontSize: '0.72rem', fontWeight: 700,
                }}>
                  💰 ₹{Number(u.wallet).toFixed(2)} wallet
                </span>
                <span style={{
                  padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)',
                  background: 'var(--surface-2)', color: 'var(--text-muted)',
                  fontSize: '0.72rem', fontWeight: 600,
                }}>
                  Joined {joinedDate}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <button
                disabled={acting}
                onClick={toggleBan}
                style={{
                  padding: '0.45rem 1rem', borderRadius: 'var(--r-pill)',
                  border: `1.5px solid ${u.is_banned ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                  background: u.is_banned ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                  color: u.is_banned ? '#047857' : '#b91c1c',
                  fontSize: '0.8rem', fontWeight: 700, cursor: acting ? 'not-allowed' : 'pointer',
                  opacity: acting ? 0.6 : 1,
                }}
              >
                {acting ? '…' : u.is_banned ? '✅ Unban' : '🚫 Ban'}
              </button>
              <button
                onClick={() => setRolePanel(v => !v)}
                style={{
                  padding: '0.45rem 1rem', borderRadius: 'var(--r-pill)',
                  border: '1.5px solid var(--border)', background: 'var(--surface-2)',
                  color: 'var(--text-pri)', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer',
                }}
              >
                ✏️ Change Role
              </button>
            </div>
          </div>

          {/* Role change panel */}
          {rolePanel && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              style={{ marginTop: '1rem', padding: '1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', display: 'flex', alignItems: 'center', gap: '0.75rem', flexWrap: 'wrap' }}
            >
              <label style={{ fontWeight: 700, fontSize: '0.85rem' }}>New role:</label>
              <select
                value={roleInput}
                onChange={e => setRoleInput(e.target.value as 'customer' | 'admin')}
                style={{ padding: '0.4rem 0.8rem', borderRadius: 'var(--r-lg)', border: '1.5px solid var(--border)', background: 'var(--surface)', fontSize: '0.85rem' }}
              >
                <option value="customer">Customer</option>
                <option value="admin">Admin</option>
              </select>
              <button
                disabled={acting || roleInput === u.role}
                onClick={changeRole}
                style={{
                  padding: '0.4rem 1rem', borderRadius: 'var(--r-pill)',
                  background: 'var(--gradient-brand)', color: '#fff',
                  border: 'none', fontWeight: 700, fontSize: '0.82rem',
                  cursor: (acting || roleInput === u.role) ? 'not-allowed' : 'pointer',
                  opacity: (acting || roleInput === u.role) ? 0.5 : 1,
                }}
              >
                {acting ? 'Saving…' : 'Apply'}
              </button>
              <button onClick={() => setRolePanel(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '0.85rem' }}>Cancel</button>
            </motion.div>
          )}
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.08 }}
          style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}
        >
          <StatCard icon="📦" label="Total Orders" value={String(stats.order_count)} />
          <StatCard icon="🖨️" label="Print Jobs"  value={String(stats.print_count)} />
          <StatCard icon="💸" label="Total Spent"  value={`₹${Number(stats.total_spent).toFixed(0)}`} />
        </motion.div>

        {/* Recent Orders */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.12 }}
          style={{ marginBottom: '1.25rem' }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Recent Orders</h2>
          {recentOrders.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No orders yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentOrders.map((o: any) => (
                <div key={o.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.7rem 1rem', borderRadius: 'var(--r-lg)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>#{o.sequence_number}</span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                      {new Date(o.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <StatusBadge status={o.payment_status} map={ORDER_STATUS_COLOR} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>₹{Number(o.total).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Recent Print Jobs */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.16 }}
          style={{ marginBottom: '2rem' }}
        >
          <h2 style={{ fontSize: '1rem', fontWeight: 800, marginBottom: '0.75rem', letterSpacing: '-0.02em' }}>Recent Print Jobs</h2>
          {recentPrints.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No print jobs yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {recentPrints.map((p: any) => (
                <div key={p.id} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '0.7rem 1rem', borderRadius: 'var(--r-lg)',
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: '0.85rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '220px', display: 'inline-block' }}>
                      {p.file_name}
                    </span>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginLeft: '0.5rem' }}>
                      {new Date(p.created_at).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                    <StatusBadge status={p.status} map={PRINT_STATUS_COLOR} />
                    <span style={{ fontWeight: 700, fontSize: '0.85rem' }}>₹{Number(p.amount).toFixed(0)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </motion.div>

        {/* Back */}
        <button
          onClick={() => router.push('/admin/users')}
          style={{
            padding: '0.55rem 1.4rem', borderRadius: 'var(--r-pill)',
            border: '1.5px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-pri)', fontWeight: 700, fontSize: '0.88rem', cursor: 'pointer',
          }}
        >
          ← All Users
        </button>
      </div>
    </div>
  );
}

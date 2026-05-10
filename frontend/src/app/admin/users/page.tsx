'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { adminUsersApi, AdminUser } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

// ─── Status badges ────────────────────────────────────────────────────────────

function RoleBadge({ role }: { role: 'customer' | 'admin' }) {
  const cfg = role === 'admin'
    ? { bg: 'rgba(79,70,229,0.12)', color: '#4338ca', label: '⭐ Admin' }
    : { bg: 'rgba(16,185,129,0.12)', color: '#047857', label: '👤 Customer' };
  return (
    <span style={{
      padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)',
      background: cfg.bg, color: cfg.color,
      fontSize: '0.72rem', fontWeight: 700, whiteSpace: 'nowrap',
    }}>{cfg.label}</span>
  );
}

function BannedBadge() {
  return (
    <span style={{
      padding: '0.18rem 0.65rem', borderRadius: 'var(--r-pill)',
      background: 'rgba(239,68,68,0.12)', color: '#b91c1c',
      fontSize: '0.72rem', fontWeight: 700,
    }}>🚫 Banned</span>
  );
}

// ─── Avatar initial ───────────────────────────────────────────────────────────

function Avatar({ name, size = 38 }: { name: string; size?: number }) {
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

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [users,   setUsers]   = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [total,   setTotal]   = useState(0);
  const [pages,   setPages]   = useState(1);
  const [page,    setPage]    = useState(1);
  const [search,  setSearch]  = useState('');
  const [role,    setRole]    = useState('');
  const [actionId, setActionId] = useState<string | null>(null);

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Auth guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.replace('/dashboard');
    }
  }, [user, authLoading, router]);

  // ─── Fetch ────────────────────────────────────────────────────────────────
  const fetchUsers = useCallback(async (q: string, r: string, p: number) => {
    setLoading(true);
    try {
      const res = await adminUsersApi.list({ search: q, role: r, page: p });
      setUsers(res.data);
      setTotal(res.total);
      setPages(res.pages);
      setPage(res.page);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  // Debounce search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => fetchUsers(search, role, 1), 350);
  }, [search, role, fetchUsers]);

  // ─── Ban / Unban ─────────────────────────────────────────────────────────
  const toggleBan = async (u: AdminUser) => {
    setActionId(u.id);
    try {
      if (u.is_banned) {
        await adminUsersApi.unban(u.id);
      } else {
        if (!confirm(`Ban ${u.name}? They won't be able to use College Corner.`)) return;
        await adminUsersApi.ban(u.id);
      }
      fetchUsers(search, role, page);
    } catch (err: any) {
      alert(err?.message || 'Action failed');
    } finally {
      setActionId(null);
    }
  };

  if (authLoading || !user) return null;

  // ─── Render ───────────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight: '100vh', background: 'var(--bg)', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>

        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -12 }}
          animate={{ opacity: 1, y: 0 }}
          style={{ marginBottom: '2rem' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.4rem' }}>
            <a href="/admin" style={{ color: 'var(--text-muted)', fontSize: '0.82rem', textDecoration: 'none' }}>
              Admin
            </a>
            <span style={{ color: 'var(--text-muted)' }}>›</span>
            <span style={{ color: 'var(--indigo)', fontSize: '0.82rem', fontWeight: 600 }}>Users</span>
          </div>
          <h1 style={{
            fontFamily: 'var(--font-heading)', fontSize: 'clamp(1.5rem,4vw,2rem)',
            fontWeight: 900, letterSpacing: '-0.03em',
            background: 'var(--gradient-brand)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent',
          }}>
            User Management
          </h1>
          <p style={{ color: 'var(--text-sec)', fontSize: '0.88rem', marginTop: '0.3rem' }}>
            {total} total users
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.05 }}
          style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}
        >
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="🔍  Search by name or email…"
            style={{
              flex: '1 1 240px', padding: '0.6rem 1rem', borderRadius: 'var(--r-lg)',
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              fontSize: '0.88rem', color: 'var(--text-pri)', outline: 'none',
            }}
          />
          <select
            value={role}
            onChange={e => setRole(e.target.value)}
            style={{
              padding: '0.6rem 1rem', borderRadius: 'var(--r-lg)',
              border: '1.5px solid var(--border)', background: 'var(--surface)',
              fontSize: '0.88rem', color: 'var(--text-pri)', cursor: 'pointer',
            }}
          >
            <option value="">All roles</option>
            <option value="customer">Customer</option>
            <option value="admin">Admin</option>
          </select>
        </motion.div>

        {/* User list */}
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {[1, 2, 3, 4, 5].map(i => (
              <div key={i} style={{
                height: 72, borderRadius: 'var(--r-xl)',
                background: 'var(--surface-2)',
                animation: 'pulse 1.4s ease-in-out infinite',
              }} />
            ))}
          </div>
        ) : users.length === 0 ? (
          <div style={{
            padding: '3rem 2rem', textAlign: 'center', borderRadius: 'var(--r-xl)',
            border: '1.5px dashed var(--border)', color: 'var(--text-muted)',
          }}>
            <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>👥</div>
            No users found
          </div>
        ) : (
          <AnimatePresence mode="popLayout">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
              {users.map((u, idx) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '0.9rem 1.2rem', borderRadius: 'var(--r-xl)',
                    background: 'var(--surface)', border: `1.5px solid ${u.is_banned ? 'rgba(239,68,68,0.25)' : 'var(--border)'}`,
                    cursor: 'pointer', transition: 'border-color 0.15s',
                  }}
                  onClick={() => router.push(`/admin/users/${u.id}`)}
                >
                  <Avatar name={u.name} />

                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                      <span style={{ fontWeight: 700, fontSize: '0.92rem' }}>{u.name}</span>
                      <RoleBadge role={u.role} />
                      {u.is_banned && <BannedBadge />}
                    </div>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.78rem', marginTop: '0.15rem' }}>
                      {u.email} · {u.order_count} orders · {u.print_count} prints · ₹{Number(u.wallet).toFixed(0)} wallet
                    </p>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexShrink: 0 }}>
                    <button
                      disabled={actionId === u.id}
                      onClick={e => { e.stopPropagation(); toggleBan(u); }}
                      style={{
                        padding: '0.3rem 0.8rem', borderRadius: 'var(--r-pill)',
                        border: `1.5px solid ${u.is_banned ? 'rgba(16,185,129,0.4)' : 'rgba(239,68,68,0.4)'}`,
                        background: u.is_banned ? 'rgba(16,185,129,0.08)' : 'rgba(239,68,68,0.08)',
                        color: u.is_banned ? '#047857' : '#b91c1c',
                        fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer',
                        opacity: actionId === u.id ? 0.5 : 1,
                      }}
                    >
                      {actionId === u.id ? '…' : u.is_banned ? 'Unban' : 'Ban'}
                    </button>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.9rem' }}>›</span>
                  </div>
                </motion.div>
              ))}
            </div>
          </AnimatePresence>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div style={{
            display: 'flex', justifyContent: 'center', gap: '0.5rem',
            marginTop: '1.5rem',
          }}>
            {Array.from({ length: pages }, (_, i) => i + 1).map(p => (
              <button
                key={p}
                onClick={() => fetchUsers(search, role, p)}
                style={{
                  width: 36, height: 36, borderRadius: 'var(--r-lg)',
                  border: '1.5px solid var(--border)',
                  background: p === page ? 'var(--indigo)' : 'var(--surface)',
                  color: p === page ? '#fff' : 'var(--text-pri)',
                  fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer',
                }}
              >{p}</button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

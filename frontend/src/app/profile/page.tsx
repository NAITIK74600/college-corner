'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { authApi } from '@/lib/api';

const E = [0.25, 0.1, 0.25, 1] as [number, number, number, number];

// ─── Toast ───────────────────────────────────────────────────────────────────
function Toast({ msg, ok }: { msg: string; ok: boolean }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 24, scale: 0.95 }}
      animate={{ opacity: 1, y: 0,  scale: 1 }}
      exit={{  opacity: 0, y: 16, scale: 0.95 }}
      transition={{ duration: 0.3, ease: E }}
      style={{
        position: 'fixed', bottom: '2rem', left: '50%', transform: 'translateX(-50%)',
        padding: '0.65rem 1.4rem', borderRadius: 'var(--r-pill)',
        background: ok ? 'rgba(5,150,105,0.95)' : 'rgba(220,38,38,0.95)',
        color: '#fff', fontWeight: 700, fontSize: '0.88rem',
        boxShadow: 'var(--shadow-lg)', zIndex: 9999, whiteSpace: 'nowrap',
      }}
    >
      {msg}
    </motion.div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────────
function Card({ children, title, icon }: { children: React.ReactNode; title: string; icon: string }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: E }}
      style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 'var(--r-xl)', padding: '1.75rem',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '1.4rem' }}>
        <span style={{ fontSize: '1.3rem' }}>{icon}</span>
        <h2 style={{ fontWeight: 800, fontSize: '1rem', margin: 0 }}>{title}</h2>
      </div>
      {children}
    </motion.div>
  );
}

// ─── Input helper ─────────────────────────────────────────────────────────────
function Field({
  label, value, onChange, type = 'text', placeholder, disabled,
}: {
  label: string; value: string; onChange: (v: string) => void;
  type?: string; placeholder?: string; disabled?: boolean;
}) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: 700, marginBottom: '0.4rem', color: 'var(--text-sec)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
      </label>
      <input
        type={type}
        value={value}
        placeholder={placeholder}
        disabled={disabled}
        onChange={e => onChange(e.target.value)}
        style={{
          width: '100%', padding: '0.65rem 0.9rem',
          borderRadius: 'var(--r-sm)',
          border: '1.5px solid var(--border-strong)',
          background: disabled ? 'var(--surface-2)' : 'var(--surface)',
          color: disabled ? 'var(--text-muted)' : 'var(--text-pri)',
          fontSize: '0.92rem', fontFamily: 'var(--font-body)',
          outline: 'none', boxSizing: 'border-box',
          opacity: disabled ? 0.7 : 1,
        }}
      />
    </div>
  );
}

function PrimaryButton({ children, onClick, loading, disabled }: {
  children: React.ReactNode; onClick: () => void;
  loading?: boolean; disabled?: boolean;
}) {
  return (
    <motion.button
      onClick={onClick}
      disabled={loading || disabled}
      whileHover={!loading && !disabled ? { scale: 1.03 } : {}}
      whileTap={!loading && !disabled ? { scale: 0.97 } : {}}
      style={{
        padding: '0.6rem 1.5rem', borderRadius: 'var(--r-pill)',
        background: 'linear-gradient(135deg, #4f46e5, #7c3aed)',
        color: '#fff', fontWeight: 700, fontSize: '0.88rem',
        border: 'none', cursor: loading || disabled ? 'not-allowed' : 'pointer',
        opacity: loading || disabled ? 0.7 : 1,
      }}
    >
      {loading ? 'Saving…' : children}
    </motion.button>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────
export default function ProfilePage() {
  const router = useRouter();
  const { user, loading, refresh, logout } = useAuth();

  // Profile form
  const [name,        setName]        = useState('');
  const [nameLoading, setNameLoading] = useState(false);

  // Password form
  const [curPwd,    setCurPwd]    = useState('');
  const [newPwd,    setNewPwd]    = useState('');
  const [pwdError,  setPwdError]  = useState('');
  const [pwdLoad,   setPwdLoad]   = useState(false);

  // Toast
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  useEffect(() => {
    if (user) setName(user.name);
  }, [user]);

  if (loading || !user) return null;

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleSaveName = async () => {
    if (!name.trim() || name.trim() === user.name) return;
    setNameLoading(true);
    try {
      await (authApi as any).updateProfile(name.trim());
      await refresh();
      showToast('Name updated ✅');
    } catch (e: any) {
      showToast(e?.errors?.[0]?.msg || e?.message || 'Update failed', false);
    } finally {
      setNameLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setPwdError('');
    if (!curPwd || !newPwd) { setPwdError('Both fields are required.'); return; }
    if (newPwd.length < 8)  { setPwdError('New password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(newPwd)) { setPwdError('Must include an uppercase letter.'); return; }
    if (!/[0-9]/.test(newPwd)) { setPwdError('Must include a number.'); return; }
    setPwdLoad(true);
    try {
      await (authApi as any).changePassword(curPwd, newPwd);
      showToast('Password changed — please log in again.');
      setTimeout(async () => { await logout(); router.push('/login'); }, 1800);
    } catch (e: any) {
      setPwdError(e?.message || 'Incorrect current password.');
    } finally {
      setPwdLoad(false);
    }
  };

  const joined = new Date(user.created_at).toLocaleDateString('en-IN', {
    day: 'numeric', month: 'long', year: 'numeric',
  });

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 2rem)' }}>

      {/* Back nav */}
      <Link href="/dashboard" style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)', textDecoration: 'none', marginBottom: '2rem' }}>
        ← Dashboard
      </Link>

      {/* Page header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: E }}
        style={{ marginBottom: '2rem' }}
      >
        <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '0.35rem' }}>
          ACCOUNT
        </p>
        <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2rem)', fontWeight: 900, letterSpacing: '-0.03em', margin: 0 }}>
          Your Profile
        </h1>
      </motion.div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>

        {/* ── Account info ───────────────────────────────────────────── */}
        <Card title="Account Info" icon="👤">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem 1.5rem', marginBottom: '0.5rem' }}>
            {[
              { label: 'Email',   value: user.email },
              { label: 'Role',    value: user.role.charAt(0).toUpperCase() + user.role.slice(1) },
              { label: 'Wallet',  value: `₹${parseFloat(user.wallet || '0').toFixed(2)}` },
              { label: 'Joined',  value: joined },
            ].map(({ label, value }) => (
              <div key={label}>
                <p style={{ fontSize: '0.73rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>{label}</p>
                <p style={{ fontWeight: 700, fontSize: '0.92rem' }}>{value}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* ── Edit name ─────────────────────────────────────────────── */}
        <Card title="Display Name" icon="✏️">
          <Field label="Full name" value={name} onChange={setName} placeholder="Your name" />
          <PrimaryButton
            onClick={handleSaveName}
            loading={nameLoading}
            disabled={!name.trim() || name.trim() === user.name}
          >
            Save name
          </PrimaryButton>
        </Card>

        {/* ── Change password ───────────────────────────────────────── */}
        <Card title="Change Password" icon="🔒">
          <Field label="Current password" type="password" value={curPwd} onChange={setCurPwd} placeholder="••••••••" />
          <Field label="New password"     type="password" value={newPwd} onChange={setNewPwd} placeholder="Min 8 chars, 1 uppercase, 1 number" />
          {pwdError && (
            <p style={{ fontSize: '0.82rem', color: '#dc2626', fontWeight: 600, marginBottom: '0.9rem', marginTop: '-0.4rem' }}>
              {pwdError}
            </p>
          )}
          <PrimaryButton onClick={handleChangePassword} loading={pwdLoad}>
            Change password
          </PrimaryButton>
          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>
            You will be signed out immediately after changing your password.
          </p>
        </Card>

      </div>

      <AnimatePresence>
        {toast && <Toast msg={toast.msg} ok={toast.ok} />}
      </AnimatePresence>
    </div>
  );
}

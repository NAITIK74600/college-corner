'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { authApi } from '@/lib/api';
import type { AuthResponse } from '@/types';

/* â”€â”€â”€ Field component â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function Field({
  label, type = 'text', value, onChange, placeholder, optional,
}: {
  label: string; type?: string; value: string;
  onChange: (v: string) => void; placeholder?: string; optional?: boolean;
}) {
  const [focused, setFocused] = useState(false);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)', display: 'flex', alignItems: 'center', gap: '5px' }}>
        {label}
        {optional && <span style={{ fontWeight: 400, color: 'var(--text-muted)', fontSize: '0.78rem' }}>(optional)</span>}
      </label>
      <motion.div
        animate={{ boxShadow: focused ? '0 0 0 3px rgba(79,70,229,0.18)' : '0 0 0 0px transparent' }}
        transition={{ duration: 0.2 }}
        style={{ borderRadius: 'var(--r-sm)' }}
      >
        <input
          type={type}
          value={value}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          required={!optional}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          style={{
            width: '100%',
            padding: '0.72rem 1rem',
            borderRadius: 'var(--r-sm)',
            border: `1.5px solid ${focused ? 'var(--indigo)' : 'var(--border-strong)'}`,
            background: 'var(--surface-2)',
            color: 'var(--text-pri)',
            fontSize: '0.95rem',
            outline: 'none',
            transition: 'border-color 0.2s ease',
          }}
        />
      </motion.div>
    </div>
  );
}

/* â”€â”€â”€ Password strength indicator â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
function PasswordStrength({ password }: { password: string }) {
  const score = [
    password.length >= 8,
    /[A-Z]/.test(password),
    /[0-9]/.test(password),
    /[^A-Za-z0-9]/.test(password),
  ].filter(Boolean).length;

  const labels = ['', 'Weak', 'Fair', 'Good', 'Strong'];
  const colors = ['', '#ef4444', '#f97316', '#eab308', '#22c55e'];

  if (!password) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      style={{ marginTop: '4px' }}
    >
      <div style={{ display: 'flex', gap: '4px', marginBottom: '4px' }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 3, borderRadius: 2,
            background: i <= score ? colors[score] : 'var(--surface-3)',
            transition: 'background 0.3s ease',
          }} />
        ))}
      </div>
      <p style={{ fontSize: '0.76rem', color: colors[score], fontWeight: 600 }}>{labels[score]}</p>
    </motion.div>
  );
}

/* â”€â”€â”€ Page â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€ */
export default function SignupPage() {
  const router   = useRouter();
  const [name,     setName]     = useState('');
  const [email,    setEmail]    = useState('');
  const [phone,    setPhone]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload: Record<string, string> = { name, email, password };
      if (phone.trim()) payload.phone = phone.trim();
      const res = await authApi.signup(payload) as AuthResponse;
      if (res.success) router.push('/dashboard');
    } catch (err: unknown) {
      const e = err as AuthResponse;
      setError(e.message || e.errors?.[0]?.msg || 'Signup failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '3rem 1.5rem',
      position: 'relative', overflow: 'hidden',
    }}>
      {/* Ambient orbs */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{ position: 'absolute', top: '5%', right: '8%', width: 380, height: 380, background: 'radial-gradient(circle, rgba(124,58,237,0.1) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(55px)' }} />
        <div style={{ position: 'absolute', bottom: '5%', left: '5%', width: 320, height: 320, background: 'radial-gradient(circle, rgba(79,70,229,0.08) 0%, transparent 70%)', borderRadius: '50%', filter: 'blur(45px)' }} />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
        animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
        transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
        style={{
          width: '100%', maxWidth: '460px',
          background: 'rgba(255,255,255,0.82)',
          backdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: 'var(--r-xl)',
          border: '1px solid var(--border)',
          boxShadow: 'var(--shadow-xl)',
          padding: 'clamp(2rem, 5vw, 2.75rem)',
          position: 'relative', zIndex: 1,
        }}
      >
        {/* Logo mark */}
        <motion.div
          initial={{ scale: 0.7, opacity: 0 }}
          animate={{ scale: 1,   opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
          style={{ textAlign: 'center', marginBottom: '1.75rem' }}
        >
          <div style={{
            width: 52, height: 52,
            background: 'var(--gradient-brand)',
            borderRadius: 'var(--r-md)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: '1.4rem', fontWeight: 900, color: '#fff',
            margin: '0 auto 1rem',
            boxShadow: 'var(--shadow-brand)',
          }}>C</div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.3rem', letterSpacing: '-0.03em' }}>
            Create your account
          </h1>
          <p style={{ color: 'var(--text-sec)', fontSize: '0.88rem' }}>
            Join thousands of students on College Corner
          </p>
        </motion.div>

        {/* Error */}
        <AnimatePresence>
          {error && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.97 }}
              animate={{ opacity: 1, y: 0,   scale: 1 }}
              exit={{   opacity: 0, y: -8,   scale: 0.97 }}
              transition={{ duration: 0.25 }}
              style={{
                padding: '0.75rem 1rem',
                borderRadius: 'var(--r-sm)',
                background: 'rgba(239,68,68,0.08)',
                border: '1px solid rgba(239,68,68,0.22)',
                color: '#dc2626',
                fontSize: '0.875rem',
                marginBottom: '1.25rem',
                display: 'flex', gap: '8px',
              }}
            >
              <span>⚠️</span><span>{error}</span>
            </motion.div>
          )}
        </AnimatePresence>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
          {/* Name + email side by side on wider form */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.85rem' }}>
            <Field label="Full name"       value={name}  onChange={setName}  placeholder="Riya Sharma" />
            <Field label="Email" type="email" value={email} onChange={setEmail} placeholder="you@college.edu" />
          </div>

          <Field label="Phone number" type="tel" value={phone} onChange={setPhone} placeholder="98XXXXXXXX" optional />

          <div>
            <Field label="Password" type="password" value={password} onChange={setPassword} placeholder="Min. 8 chars, 1 uppercase, 1 number" />
            <PasswordStrength password={password} />
          </div>

          <motion.button
            type="submit"
            disabled={loading}
            whileHover={!loading ? { scale: 1.02, boxShadow: '0 10px 36px rgba(79,70,229,0.38)' } : {}}
            whileTap={!loading ? { scale: 0.98 } : {}}
            transition={{ type: 'spring', stiffness: 400, damping: 22 }}
            style={{
              width: '100%',
              padding: '0.82rem',
              borderRadius: 'var(--r-pill)',
              background: loading ? 'var(--surface-3)' : 'var(--gradient-brand)',
              color: loading ? 'var(--text-muted)' : '#fff',
              fontWeight: 800, fontSize: '0.95rem',
              border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
              marginTop: '0.4rem',
              boxShadow: loading ? 'none' : 'var(--shadow-brand)',
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={loading ? 'loading' : 'idle'}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{   opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
              >
                {loading ? (
                  <>
                    <motion.span
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                      style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: 'var(--text-muted)', borderRadius: '50%' }}
                    />
                    Creating account…
                  </>
                ) : 'Create account →'}
              </motion.span>
            </AnimatePresence>
          </motion.button>
        </form>

        <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-sec)' }}>
          Already have an account?{' '}
          <Link href="/login" style={{ color: 'var(--indigo)', fontWeight: 700, textDecoration: 'none' }}>
            Log in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}



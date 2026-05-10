'use client';

import { useState, FormEvent } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

/* ─── Field ──────────────────────────────────────────────────────────────── */
function Field({
  label, type = 'text', value, onChange, placeholder,
}: {
  label: string;
  type?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)', letterSpacing: '0.01em' }}>
        {label}
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
          required
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
            boxSizing: 'border-box',
          }}
        />
      </motion.div>
    </div>
  );
}

/* ─── Page ───────────────────────────────────────────────────────────────── */
export default function ForgotPasswordPage() {
  const [email,   setEmail]   = useState('');
  const [status,  setStatus]  = useState<'idle' | 'loading' | 'sent' | 'error'>('idle');
  const [message, setMessage] = useState('');

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const res = await fetch(`${API_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (data.success) {
        setStatus('sent');
      } else {
        setStatus('error');
        setMessage(data.message || 'Something went wrong. Please try again.');
      }
    } catch {
      setStatus('error');
      setMessage('Could not reach the server. Please check your connection.');
    }
  }

  return (
    <div style={{
      minHeight: 'calc(100vh - 68px)',
      display: 'flex',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Ambient orbs */}
      <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
        <div style={{
          position: 'absolute', top: '5%', left: '5%',
          width: 360, height: 360,
          background: 'radial-gradient(circle, rgba(79,70,229,0.1) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '10%', right: '10%',
          width: 300, height: 300,
          background: 'radial-gradient(circle, rgba(236,72,153,0.08) 0%, transparent 70%)',
          borderRadius: '50%', filter: 'blur(40px)',
        }} />
      </div>

      {/* Form column */}
      <div style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '3rem 1.5rem',
        position: 'relative', zIndex: 1,
      }}>
        <motion.div
          initial={{ opacity: 0, y: 32, filter: 'blur(8px)' }}
          animate={{ opacity: 1, y: 0,  filter: 'blur(0px)' }}
          transition={{ duration: 0.6, ease: [0.25, 0.1, 0.25, 1] }}
          style={{
            width: '100%', maxWidth: '420px',
            background: 'rgba(255,255,255,0.8)',
            backdropFilter: 'blur(24px) saturate(180%)',
            borderRadius: 'var(--r-xl)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-xl)',
            padding: 'clamp(2rem, 5vw, 2.75rem)',
          }}
        >
          {/* Icon */}
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
              fontSize: '1.4rem',
              margin: '0 auto 1rem',
              boxShadow: 'var(--shadow-brand)',
            }}>🔑</div>
            <h1 style={{ fontSize: '1.6rem', fontWeight: 900, marginBottom: '0.3rem', letterSpacing: '-0.03em' }}>
              Forgot password?
            </h1>
            <p style={{ color: 'var(--text-sec)', fontSize: '0.88rem' }}>
              Enter your email and we&apos;ll send a reset link.
            </p>
          </motion.div>

          <AnimatePresence mode="wait">
            {status === 'sent' ? (
              /* Success state */
              <motion.div
                key="sent"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.35 }}
                style={{ textAlign: 'center' }}
              >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>📬</div>
                <p style={{ fontWeight: 700, fontSize: '1.05rem', marginBottom: '0.5rem' }}>
                  Check your inbox!
                </p>
                <p style={{ color: 'var(--text-sec)', fontSize: '0.88rem', marginBottom: '1.75rem' }}>
                  If <strong>{email}</strong> is registered, you&apos;ll receive a password reset link shortly.
                </p>
                <Link
                  href="/login"
                  style={{
                    display: 'inline-block',
                    padding: '0.72rem 2rem',
                    borderRadius: 'var(--r-pill)',
                    background: 'var(--gradient-brand)',
                    color: '#fff',
                    fontWeight: 800,
                    fontSize: '0.92rem',
                    textDecoration: 'none',
                    boxShadow: 'var(--shadow-brand)',
                  }}
                >
                  Back to Sign in
                </Link>
              </motion.div>
            ) : (
              /* Form state */
              <motion.div key="form" initial={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {/* Error banner */}
                <AnimatePresence>
                  {status === 'error' && (
                    <motion.div
                      initial={{ opacity: 0, y: -8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{   opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      style={{
                        padding: '0.75rem 1rem',
                        borderRadius: 'var(--r-sm)',
                        background: 'rgba(239,68,68,0.08)',
                        border: '1px solid rgba(239,68,68,0.22)',
                        color: '#dc2626',
                        fontSize: '0.875rem',
                        marginBottom: '1.25rem',
                        display: 'flex', alignItems: 'flex-start', gap: '8px',
                      }}
                    >
                      <span>⚠️</span><span>{message}</span>
                    </motion.div>
                  )}
                </AnimatePresence>

                <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.1rem' }}>
                  <Field
                    label="Email address"
                    type="email"
                    value={email}
                    onChange={setEmail}
                    placeholder="you@college.edu"
                  />

                  <motion.button
                    type="submit"
                    disabled={status === 'loading'}
                    whileHover={status !== 'loading' ? { scale: 1.02, boxShadow: '0 10px 36px rgba(79,70,229,0.38)' } : {}}
                    whileTap={status !== 'loading' ? { scale: 0.98 } : {}}
                    transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                    style={{
                      width: '100%',
                      padding: '0.82rem',
                      borderRadius: 'var(--r-pill)',
                      background: status === 'loading' ? 'var(--surface-3)' : 'var(--gradient-brand)',
                      color: status === 'loading' ? 'var(--text-muted)' : '#fff',
                      fontWeight: 800, fontSize: '0.95rem',
                      border: 'none', cursor: status === 'loading' ? 'not-allowed' : 'pointer',
                      marginTop: '0.4rem',
                      boxShadow: status === 'loading' ? 'none' : 'var(--shadow-brand)',
                    }}
                  >
                    <AnimatePresence mode="wait" initial={false}>
                      <motion.span
                        key={status === 'loading' ? 'loading' : 'idle'}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{   opacity: 0, y: -6 }}
                        transition={{ duration: 0.18 }}
                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                      >
                        {status === 'loading' ? (
                          <>
                            <motion.span
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                              style={{ display: 'inline-block', width: 16, height: 16, border: '2px solid rgba(0,0,0,0.15)', borderTopColor: 'var(--text-muted)', borderRadius: '50%' }}
                            />
                            Sending…
                          </>
                        ) : 'Send reset link →'}
                      </motion.span>
                    </AnimatePresence>
                  </motion.button>
                </form>

                <p style={{ textAlign: 'center', marginTop: '1.5rem', fontSize: '0.875rem', color: 'var(--text-sec)' }}>
                  Remember it?{' '}
                  <Link href="/login" style={{ color: 'var(--indigo)', fontWeight: 700, textDecoration: 'none' }}>
                    Sign in
                  </Link>
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  );
}

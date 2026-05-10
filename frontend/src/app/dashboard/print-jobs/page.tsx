'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { printApi } from '@/lib/api';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_CFG: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  pending:    { label: 'Pending',    color: '#6366f1', bg: 'rgba(99,102,241,0.1)',  icon: '⏳' },
  paid:       { label: 'Paid',       color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)',  icon: '💳' },
  processing: { label: 'Processing', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)',  icon: '⚙️' },
  printed:    { label: 'Printed',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)',  icon: '🖨️' },
  ready:      { label: 'Ready',      color: '#10b981', bg: 'rgba(16,185,129,0.1)',  icon: '✅' },
  failed:     { label: 'Failed',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)',   icon: '❌' },
};

// ─── Animations ───────────────────────────────────────────────────────────────

const containerV = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
};
const rowV = {
  hidden:  { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: [0.25, 0.1, 0.25, 1] as [number,number,number,number] } },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatusBadge({ status }: { status: string }) {
  const cfg = STATUS_CFG[status] ?? { label: status, color: '#6b7280', bg: 'rgba(107,114,128,0.1)', icon: '•' };
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem', padding: '0.22rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700, color: cfg.color, background: cfg.bg }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function Skeleton() {
  return (
    <>
      {[0, 1, 2].map(i => (
        <div key={i} style={{ height: 76, borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', marginBottom: '0.75rem', animation: 'pulse 1.6s ease-in-out infinite', opacity: 0.7 }} />
      ))}
    </>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PrintJobsPage() {
  const router = useRouter();
  const { user, loading } = useAuth();

  const [jobs,     setJobs]     = useState<any[]>([]);
  const [fetching, setFetching] = useState(true);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const res = await printApi.listJobs() as { success: boolean; data: any[] };
      setJobs(res.data ?? []);
    } catch {
      setJobs([]);
    } finally {
      setFetching(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  if (loading || (!user && !loading)) return null;

  return (
    <div style={{ maxWidth: 920, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)' }}>

      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem', gap: '1rem', flexWrap: 'wrap' }}>
        <div>
          <Link href="/dashboard"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.35rem', fontSize: '0.82rem', color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none', marginBottom: '0.5rem' }}>
            ← Dashboard
          </Link>
          <h1 style={{ fontSize: 'clamp(1.5rem,3vw,2rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-pri)', margin: 0, fontFamily: 'var(--font-heading)' }}>
            Print Jobs
          </h1>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          {!fetching && jobs.length > 0 && (
            <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)', fontWeight: 600 }}>
              {jobs.length} job{jobs.length !== 1 ? 's' : ''}
            </span>
          )}
          <Link href="/print"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)', color: '#fff', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(79,70,229,0.25)' }}>
            🖨️ New print job
          </Link>
        </div>
      </motion.div>

      {/* List */}
      {fetching ? (
        <Skeleton />
      ) : jobs.length === 0 ? (
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.42 }}
          style={{ textAlign: 'center', padding: '5rem 2rem', background: 'var(--surface-2)', borderRadius: 'var(--r-xl)', border: '1.5px dashed var(--border)' }}>
          <div style={{ fontSize: '3.5rem', marginBottom: '1rem' }}>🖨️</div>
          <h2 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-pri)', margin: '0 0 0.5rem' }}>No print jobs yet</h2>
          <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>Upload a document and we'll print it for you</p>
          <Link href="/print"
            style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.65rem 1.5rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)', color: '#fff', fontSize: '0.9rem', fontWeight: 700, textDecoration: 'none' }}>
            Start printing →
          </Link>
        </motion.div>
      ) : (
        <motion.div variants={containerV} initial="hidden" animate="visible">
          {jobs.map(job => {
            const cfg = STATUS_CFG[job.status] ?? STATUS_CFG['pending'];
            return (
              <motion.div key={job.id} variants={rowV}>
                <motion.div
                  onClick={() => router.push(`/dashboard/print-jobs/${job.id}`)}
                  whileHover={{ y: -2, boxShadow: '0 8px 32px rgba(0,0,0,0.09)' }}
                  whileTap={{ scale: 0.99 }}
                  transition={{ duration: 0.2 }}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '1rem',
                    padding: '1rem 1.25rem',
                    marginBottom: '0.75rem',
                    borderRadius: 'var(--r-lg)',
                    border: '1.5px solid var(--border)',
                    background: '#fff',
                    cursor: 'pointer',
                    boxShadow: '0 2px 12px rgba(0,0,0,0.04)',
                  }}
                >
                  {/* Icon */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 'var(--r-md)',
                    background: cfg.bg, flexShrink: 0,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: '1.3rem',
                  }}>
                    {cfg.icon}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-pri)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: 260, fontFamily: 'var(--font-body)' }}>
                        {job.file_name}
                      </span>
                      <StatusBadge status={job.status} />
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.3rem', flexWrap: 'wrap' }}>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        {job.color_mode === 'bw' ? 'Black & White' : 'Color'} · {job.page_size} · {job.total_pages}p × {job.copies} {job.lamination ? '· Laminated' : ''}
                      </span>
                      <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>
                        {fmtDate(job.created_at)}
                      </span>
                    </div>
                  </div>

                  {/* Amount + chevron */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', flexShrink: 0 }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>
                      ₹{parseFloat(job.amount).toFixed(2)}
                    </span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>›</span>
                  </div>
                </motion.div>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </div>
  );
}

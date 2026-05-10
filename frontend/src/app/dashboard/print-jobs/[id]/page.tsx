'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { printApi } from '@/lib/api';

// ─── Status timeline ──────────────────────────────────────────────────────────

const STATUS_STEPS: { key: string; label: string; icon: string }[] = [
  { key: 'pending',    label: 'Submitted',   icon: '📄' },
  { key: 'paid',       label: 'Payment Done', icon: '💳' },
  { key: 'processing', label: 'Printing',     icon: '⚙️' },
  { key: 'printed',    label: 'Printed',      icon: '🖨️' },
  { key: 'ready',      label: 'Ready',        icon: '✅' },
];

const STATUS_INDEX: Record<string, number> = {
  pending: 0, paid: 1, processing: 2, printed: 3, ready: 4, failed: -1,
};

const STATUS_LABEL: Record<string, { label: string; color: string; bg: string }> = {
  pending:    { label: 'Pending',    color: '#6366f1', bg: 'rgba(99,102,241,0.1)'  },
  paid:       { label: 'Paid',       color: '#0ea5e9', bg: 'rgba(14,165,233,0.1)'  },
  processing: { label: 'Processing', color: '#f59e0b', bg: 'rgba(245,158,11,0.1)'  },
  printed:    { label: 'Printed',    color: '#8b5cf6', bg: 'rgba(139,92,246,0.1)'  },
  ready:      { label: 'Ready',      color: '#10b981', bg: 'rgba(16,185,129,0.1)'  },
  failed:     { label: 'Failed',     color: '#ef4444', bg: 'rgba(239,68,68,0.1)'   },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function SpecRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0', borderBottom: '1px solid var(--border)' }}>
      <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>{label}</span>
      <span style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-pri)', fontFamily: 'var(--font-body)', textAlign: 'right' }}>{value}</span>
    </div>
  );
}

// ─── Page ────────────────────────────────────────────────────────────────────

export default function PrintJobDetailPage() {
  const router  = useRouter();
  const params  = useParams<{ id: string }>();
  const { user, loading } = useAuth();

  const [job,      setJob]      = useState<any | null>(null);
  const [fetching, setFetching] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [loading, user, router]);

  const load = useCallback(async () => {
    if (!user) return;
    setFetching(true);
    try {
      const res = await printApi.getJob(params.id) as { success: boolean; data: any };
      setJob(res.data);
    } catch (err: any) {
      if (err?.status === 404) setNotFound(true);
    } finally {
      setFetching(false);
    }
  }, [user, params.id]);

  useEffect(() => { load(); }, [load]);

  if (loading || (!user && !loading)) return null;

  // ── Loading skeleton ─────────────────────────────────────────────────────
  if (fetching) return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)' }}>
      {[1, 2, 3].map(i => (
        <div key={i} style={{ height: 80, borderRadius: 'var(--r-lg)', background: 'var(--surface-2)', marginBottom: '1rem', animation: 'pulse 1.6s ease-in-out infinite' }} />
      ))}
    </div>
  );

  // ── Not found ────────────────────────────────────────────────────────────
  if (notFound || !job) return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)', textAlign: 'center' }}>
      <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🔍</div>
      <h2 style={{ fontWeight: 800, marginBottom: '0.5rem' }}>Print job not found</h2>
      <p style={{ color: 'var(--text-muted)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>This job doesn't exist or belongs to another account.</p>
      <Link href="/dashboard/print-jobs" style={{ color: 'var(--indigo)', fontWeight: 700, textDecoration: 'none' }}>← Back to Print Jobs</Link>
    </div>
  );

  const stepIdx = STATUS_INDEX[job.status] ?? 0;
  const isFailed = job.status === 'failed';
  const statusCfg = STATUS_LABEL[job.status] ?? STATUS_LABEL['pending'];

  // Build reprint URL — pre-fills query params so the /print page can pick them up
  const reprintUrl = `/print?reprint=1&colorMode=${job.color_mode}&pageSize=${job.page_size}&copies=${job.copies}&lamination=${job.lamination}&totalPages=${job.total_pages}`;

  return (
    <div style={{ maxWidth: 720, margin: '0 auto', padding: 'clamp(2.5rem,5vw,4rem) clamp(1.5rem,4vw,3rem)' }}>

      {/* Breadcrumb */}
      <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.32 }}
        style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.8rem', color: 'var(--text-muted)', marginBottom: '1.5rem', fontFamily: 'var(--font-body)' }}>
        <Link href="/dashboard" style={{ color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>Dashboard</Link>
        <span>›</span>
        <Link href="/dashboard/print-jobs" style={{ color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>Print Jobs</Link>
        <span>›</span>
        <span style={{ color: 'var(--text-muted)', maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.file_name}</span>
      </motion.div>

      {/* Title + reprint */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.38 }}
        style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: 'clamp(1.3rem,3vw,1.75rem)', fontWeight: 900, letterSpacing: '-0.03em', color: 'var(--text-pri)', margin: '0 0 0.35rem', fontFamily: 'var(--font-heading)' }}>
            🖨️ Print Job
          </h1>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-body)' }}>
            Submitted {fmtDate(job.created_at)}
          </p>
        </div>
        <Link href={reprintUrl}
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.5rem 1.1rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)', color: '#fff', fontSize: '0.82rem', fontWeight: 700, textDecoration: 'none', boxShadow: '0 4px 18px rgba(79,70,229,0.25)', flexShrink: 0 }}>
          🔁 Reprint
        </Link>
      </motion.div>

      {/* Failed banner */}
      {isFailed && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}
          style={{ marginBottom: '1.5rem', padding: '1rem 1.25rem', borderRadius: 'var(--r-lg)', background: 'rgba(239,68,68,0.08)', border: '1.5px solid rgba(239,68,68,0.25)', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
          <span style={{ fontSize: '1.3rem' }}>❌</span>
          <div>
            <p style={{ fontSize: '0.9rem', fontWeight: 800, color: '#ef4444', margin: '0 0 0.2rem' }}>Print job failed</p>
            <p style={{ fontSize: '0.82rem', color: 'var(--text-sec)', margin: 0, fontFamily: 'var(--font-body)' }}>
              {job.error_message || 'An error occurred while processing your print job. Please try again.'}
            </p>
          </div>
        </motion.div>
      )}

      {/* Status timeline */}
      {!isFailed && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.08 }}
          style={{ marginBottom: '2rem', padding: '1.5rem', borderRadius: 'var(--r-xl)', background: '#fff', border: '1.5px solid var(--border)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)' }}>
          <h2 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 1.25rem', fontFamily: 'var(--font-body)' }}>
            Progress
          </h2>

          {/* Progress bar */}
          <div style={{ position: 'relative', height: 4, background: 'var(--surface-3)', borderRadius: 4, marginBottom: '1.5rem' }}>
            <motion.div
              initial={{ width: '0%' }}
              animate={{ width: stepIdx < 0 ? '0%' : `${(stepIdx / (STATUS_STEPS.length - 1)) * 100}%` }}
              transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
              style={{ position: 'absolute', left: 0, top: 0, height: '100%', borderRadius: 4, background: 'var(--gradient-brand)' }}
            />
          </div>

          {/* Steps */}
          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '0.5rem' }}>
            {STATUS_STEPS.map((step, i) => {
              const done    = stepIdx >= i;
              const current = stepIdx === i;
              return (
                <div key={step.key} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.4rem', flex: 1, minWidth: 0 }}>
                  <motion.div
                    initial={{ scale: 0.8 }}
                    animate={{ scale: current ? 1.15 : 1 }}
                    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                    style={{
                      width: 38, height: 38, borderRadius: '50%',
                      background: done ? (current ? 'var(--gradient-brand)' : 'rgba(79,70,229,0.12)') : 'var(--surface-3)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '1rem',
                      boxShadow: current ? '0 4px 16px rgba(79,70,229,0.3)' : 'none',
                    }}
                  >
                    {step.icon}
                  </motion.div>
                  <span style={{ fontSize: '0.68rem', fontWeight: done ? 700 : 500, color: done ? 'var(--indigo)' : 'var(--text-muted)', textAlign: 'center', lineHeight: 1.3, fontFamily: 'var(--font-body)' }}>
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Current status badge */}
          <div style={{ marginTop: '1.25rem', textAlign: 'center' }}>
            <span style={{ display: 'inline-flex', alignItems: 'center', gap: '0.3rem', padding: '0.3rem 0.9rem', borderRadius: '999px', fontSize: '0.8rem', fontWeight: 700, color: statusCfg.color, background: statusCfg.bg }}>
              {statusCfg.label}
            </span>
            {job.status === 'ready' && (
              <p style={{ fontSize: '0.82rem', color: '#10b981', fontWeight: 600, marginTop: '0.6rem', fontFamily: 'var(--font-body)' }}>
                🎉 Your print job is ready for pickup!
              </p>
            )}
          </div>
        </motion.div>
      )}

      {/* Job specs */}
      <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.42, delay: 0.15 }}
        style={{ padding: '1.5rem', borderRadius: 'var(--r-xl)', background: '#fff', border: '1.5px solid var(--border)', boxShadow: '0 2px 16px rgba(0,0,0,0.04)', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', margin: '0 0 0.5rem', fontFamily: 'var(--font-body)' }}>
          Job Details
        </h2>
        <SpecRow label="File"       value={<span style={{ maxWidth: 280, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'inline-block' }}>{job.file_name}</span>} />
        <SpecRow label="Color mode" value={job.color_mode === 'bw' ? 'Black & White' : 'Color'} />
        <SpecRow label="Page size"  value={job.page_size} />
        <SpecRow label="Pages"      value={`${job.total_pages} page${job.total_pages !== 1 ? 's' : ''}`} />
        <SpecRow label="Copies"     value={job.copies} />
        <SpecRow label="Lamination" value={job.lamination ? '✅ Yes' : 'No'} />
        <SpecRow label="Submitted"  value={fmtDate(job.created_at)} />
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.7rem 0 0' }}>
          <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-pri)', fontFamily: 'var(--font-body)' }}>Total</span>
          <span style={{ fontSize: '1.15rem', fontWeight: 900, color: 'var(--indigo)', fontFamily: 'var(--font-heading)' }}>
            ₹{parseFloat(job.amount).toFixed(2)}
          </span>
        </div>
      </motion.div>

      {/* Download link (if file is still accessible) */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4, delay: 0.22 }}
        style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
        <Link href="/dashboard/print-jobs"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.2rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border)', color: 'var(--text-sec)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
          ← All Print Jobs
        </Link>
        <a href={job.file_url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: '0.4rem', padding: '0.55rem 1.2rem', borderRadius: 'var(--r-pill)', border: '1.5px solid var(--border)', color: 'var(--text-sec)', fontSize: '0.85rem', fontWeight: 600, textDecoration: 'none' }}>
          📥 View file
        </a>
      </motion.div>
    </div>
  );
}

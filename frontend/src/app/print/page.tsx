'use client';

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { printApi } from '@/lib/api';
import { PrintJob } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

type ColorMode   = 'bw' | 'color';
type PageSize    = 'A4' | 'A3' | 'A5' | 'Letter';
type PaperType   = 'normal' | 'glossy' | 'thick';
type Orientation = 'portrait' | 'landscape';
type PrintRange  = 'all' | 'custom';

interface PrinterStatus {
  id:           string;
  name:         string;
  capabilities: string;
  status:       'active' | 'inactive' | 'error' | 'maintenance';
  location:     string | null;
  queue_depth:  number;
}

// ─── Pricing (mirrors backend) ────────────────────────────────────────────────

const PRICE: Record<string, number> = {
  bw_a4: 1.50, bw_a3: 3.00, bw_a5: 1.00, bw_letter: 1.50,
  color_a4: 8.00, color_a3: 16.00, color_a5: 5.00, color_letter: 8.00,
  lam_page: 15.00, paper_glossy: 5.00, paper_thick: 8.00,
};

function calcAmount(
  colorMode: ColorMode, pageSize: PageSize,
  lamination: boolean, totalPages: number, copies: number,
  paperType: PaperType = 'normal',
): number {
  const sizeKey   = pageSize.toLowerCase().replace(' ', '');
  const base      = PRICE[`${colorMode}_${sizeKey}`] ?? PRICE.bw_a4;
  const paperXtra = paperType === 'glossy' ? PRICE.paper_glossy : paperType === 'thick' ? PRICE.paper_thick : 0;
  const lamXtra   = lamination ? PRICE.lam_page : 0;
  return parseFloat(((base + paperXtra + lamXtra) * totalPages * copies).toFixed(2));
}

// ─── Status badge ─────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  pending:    { bg: 'rgba(234,179,8,0.12)',   text: '#b45309' },
  paid:       { bg: 'rgba(59,130,246,0.12)',  text: '#1d4ed8' },
  processing: { bg: 'rgba(124,58,237,0.12)',  text: '#6d28d9' },
  printed:    { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
  ready:      { bg: 'rgba(16,185,129,0.18)',  text: '#065f46' },
  failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
};

function StatusBadge({ status }: { status: string }) {
  const c = STATUS_COLORS[status] ?? { bg: 'var(--surface-2)', text: 'var(--text-sec)' };
  return (
    <span style={{
      padding: '0.2rem 0.7rem', borderRadius: 'var(--r-pill)',
      background: c.bg, color: c.text,
      fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize',
    }}>{status}</span>
  );
}

// ─── Printer Status Board ─────────────────────────────────────────────────────

function PrinterStatusIcon({ status }: { status: string }) {
  if (status === 'active')      return <span title="Active">🟢</span>;
  if (status === 'maintenance') return <span title="Maintenance">🔧</span>;
  if (status === 'error')       return <span title="Error">🔴</span>;
  return <span title="Offline">⚫</span>;
}

function PrinterBoard({ printers }: { printers: PrinterStatus[] }) {
  if (!printers.length) return null;
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.05 }}
      style={{ marginBottom: '2rem' }}
    >
      <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '0.75rem' }}>
        🖨 Printer Availability
      </p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px,1fr))', gap: '0.75rem' }}>
        {printers.map(p => (
          <div key={p.id} style={{
            padding: '0.85rem 1rem', borderRadius: 'var(--r-lg)',
            background: 'var(--surface)',
            border: `1.5px solid ${p.status === 'active' ? 'rgba(16,185,129,0.25)' : p.status === 'maintenance' ? 'rgba(234,179,8,0.3)' : 'var(--border)'}`,
            display: 'flex', flexDirection: 'column', gap: '0.3rem',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <PrinterStatusIcon status={p.status} />
              <span style={{ fontWeight: 700, fontSize: '0.88rem' }}>{p.name}</span>
            </div>
            {p.location && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>📍 {p.location}</span>}
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '0.25rem' }}>
              <span style={{ fontSize: '0.72rem', color: 'var(--text-sec)', textTransform: 'capitalize' }}>{p.capabilities}</span>
              {p.status === 'active' && (
                <span style={{ fontSize: '0.72rem', color: p.queue_depth > 3 ? '#b45309' : '#059669', fontWeight: 700 }}>
                  {p.queue_depth === 0 ? 'Free' : `${p.queue_depth} in queue`}
                </span>
              )}
              {p.status === 'maintenance' && <span style={{ fontSize: '0.72rem', color: '#b45309', fontWeight: 700 }}>Maintenance</span>}
              {p.status === 'error'       && <span style={{ fontSize: '0.72rem', color: '#b91c1c', fontWeight: 700 }}>Error</span>}
              {p.status === 'inactive'    && <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', fontWeight: 700 }}>Offline</span>}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}

// ─── Page Size visual selector ────────────────────────────────────────────────

const PAGE_DIMS: Record<PageSize, { w: number; h: number; label: string }> = {
  A4:     { w: 210, h: 297, label: '210×297 mm' },
  A3:     { w: 297, h: 420, label: '297×420 mm' },
  A5:     { w: 148, h: 210, label: '148×210 mm' },
  Letter: { w: 216, h: 279, label: '216×279 mm' },
};

function PageSizeSelector({
  value, onChange, disabled,
}: { value: PageSize; onChange: (v: PageSize) => void; disabled: boolean }) {
  const sizes: PageSize[] = ['A4', 'A3', 'A5', 'Letter'];
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)' }}>Page Size</label>
      <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
        {sizes.map(sz => {
          const d = PAGE_DIMS[sz];
          const ratio = d.w / d.h;
          const boxW  = Math.round(24 * ratio);
          return (
            <button
              key={sz}
              disabled={disabled}
              onClick={() => onChange(sz)}
              style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
                padding: '0.45rem 0.6rem', borderRadius: 'var(--r-md)',
                border: `1.5px solid ${value === sz ? 'var(--indigo)' : 'var(--border-strong)'}`,
                background: value === sz ? 'rgba(79,70,229,0.08)' : 'var(--surface)',
                color: value === sz ? 'var(--indigo)' : 'var(--text-sec)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                opacity: disabled ? 0.5 : 1,
                transition: 'border-color 0.15s, background 0.15s',
              }}
            >
              <div style={{
                width: `${boxW}px`, height: '24px',
                border: `1.5px solid ${value === sz ? 'var(--indigo)' : 'var(--border-strong)'}`,
                borderRadius: '2px',
                background: value === sz ? 'rgba(79,70,229,0.12)' : 'var(--surface-2)',
              }} />
              <span style={{ fontSize: '0.7rem', fontWeight: 700 }}>{sz}</span>
              <span style={{ fontSize: '0.62rem', color: 'var(--text-muted)' }}>{d.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PrintPage() {
  const { user } = useAuth();

  // Upload
  const [dragging, setDragging] = useState(false);
  const [file,     setFile]     = useState<File | null>(null);

  // Core config
  const [colorMode,  setColorMode]  = useState<ColorMode>('bw');
  const [pageSize,   setPageSize]   = useState<PageSize>('A4');
  const [copies,     setCopies]     = useState<number>(1);
  const [lamination, setLamination] = useState<boolean>(false);
  const [totalPages, setTotalPages] = useState<number>(1);

  // New options
  const [orientation, setOrientation] = useState<Orientation>('portrait');
  const [duplex,      setDuplex]      = useState<boolean>(false);
  const [paperType,   setPaperType]   = useState<PaperType>('normal');
  const [printRange,  setPrintRange]  = useState<PrintRange>('all');
  const [pageFrom,    setPageFrom]    = useState<number>(1);
  const [pageTo,      setPageTo]      = useState<number>(1);
  const [notes,       setNotes]       = useState<string>('');

  // Submission
  const [submitting, setSubmitting] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [submitted,  setSubmitted]  = useState<PrintJob | null>(null);

  // Past jobs & printers
  const [pastJobs,  setPastJobs]  = useState<PrintJob[]>([]);
  const [loadingJobs, setLoadingJobs] = useState(false);
  const [printers,  setPrinters]  = useState<PrinterStatus[]>([]);

  const amount = file
    ? calcAmount(colorMode, pageSize, lamination, totalPages, copies, paperType)
    : 0;

  useEffect(() => {
    if (!user) return;
    setLoadingJobs(true);
    printApi.listJobs()
      .then((res: any) => setPastJobs(res.data || []))
      .catch(() => {})
      .finally(() => setLoadingJobs(false));
    fetch('/api/print/printers/status', { credentials: 'include' })
      .then(r => r.json())
      .then(d => { if (d.success) setPrinters(d.data); })
      .catch(() => {});
  }, [user, submitted]);

  const handleFile = useCallback((f: File) => {
    setFile(f); setError(null); setSubmitted(null);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault(); setDragging(false);
    const dropped = e.dataTransfer.files[0];
    if (dropped) handleFile(dropped);
  }, [handleFile]);

  const handleSubmit = async () => {
    if (!file || !user) return;
    setError(null); setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append('file',        file);
      fd.append('colorMode',   colorMode);
      fd.append('pageSize',    pageSize);
      fd.append('copies',      String(copies));
      fd.append('lamination',  String(lamination));
      fd.append('totalPages',  String(totalPages));
      fd.append('orientation', orientation);
      fd.append('duplex',      String(duplex));
      fd.append('paperType',   paperType);
      fd.append('printRange',  printRange);
      if (printRange === 'custom') {
        fd.append('pageFrom', String(pageFrom));
        fd.append('pageTo',   String(pageTo));
      }
      if (notes.trim()) fd.append('notes', notes.trim());

      const res: any = await printApi.submitJob(fd);
      setSubmitted(res.data);
      setFile(null);
    } catch (err: any) {
      setError(err?.message || 'Failed to submit print job. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // ─── Success screen ──────────────────────────────────────────────────────────
  if (submitted) {
    return (
      <div style={{ maxWidth: '620px', margin: '0 auto', padding: 'clamp(3rem, 6vw, 5rem) clamp(1.5rem, 4vw, 3rem)', textAlign: 'center' }}>
        <motion.div initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 260, damping: 20 }}>
          <div style={{ fontSize: '4rem', marginBottom: '1.25rem' }}>🎉</div>
          <h1 style={{ fontSize: 'clamp(1.6rem, 3vw, 2.2rem)', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.5rem' }}>
            Print job submitted!
          </h1>
          <p style={{ color: 'var(--text-sec)', marginBottom: '2rem' }}>
            Your file is <strong>pending</strong> — complete payment to send it to the printer queue.
          </p>
          <div style={{
            background: 'linear-gradient(135deg,rgba(79,70,229,0.06) 0%,rgba(124,58,237,0.04) 100%)',
            border: '1px solid var(--border-brand)', borderRadius: 'var(--r-xl)',
            padding: '1.5rem', textAlign: 'left', marginBottom: '2rem',
          }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '0.75rem' }}>
              Job Summary
            </p>
            {([
              ['Job ID',      submitted.id.slice(0, 8) + '…'],
              ['File',        submitted.file_name],
              ['Mode',        submitted.color_mode === 'bw' ? 'Black & White' : 'Color'],
              ['Size',        submitted.page_size],
              ['Orientation', (submitted as any).orientation ?? 'portrait'],
              ['Paper',       (submitted as any).paper_type ?? 'normal'],
              ['Duplex',      (submitted as any).duplex ? 'Yes' : 'No'],
              ['Pages',       String(submitted.total_pages)],
              ['Copies',      String(submitted.copies)],
              ['Laminate',    submitted.lamination ? 'Yes' : 'No'],
              ['Total',       `₹${submitted.amount}`],
            ] as [string, string][]).map(([k, v]) => (
              <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.35rem 0', borderBottom: '1px solid var(--border)' }}>
                <span style={{ color: 'var(--text-sec)', fontSize: '0.88rem' }}>{k}</span>
                <span style={{ fontWeight: 700, fontSize: '0.88rem', textTransform: 'capitalize' }}>{v}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'center', flexWrap: 'wrap' }}>
            <motion.button whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }} onClick={() => setSubmitted(null)}
              style={{ padding: '0.75rem 2rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 800, fontSize: '0.92rem', border: 'none', cursor: 'pointer', boxShadow: 'var(--shadow-brand)' }}>
              Submit another
            </motion.button>
            <motion.a href="/dashboard/print-jobs" whileHover={{ scale: 1.02 }}
              style={{ padding: '0.75rem 1.5rem', borderRadius: 'var(--r-pill)', background: 'var(--surface)', color: 'var(--text-pri)', fontWeight: 700, fontSize: '0.92rem', border: '1.5px solid var(--border-strong)', cursor: 'pointer', textDecoration: 'none' }}>
              View my jobs
            </motion.a>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '960px', margin: '0 auto', padding: 'clamp(2.5rem, 5vw, 4rem) clamp(1.5rem, 4vw, 3rem)' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }} style={{ marginBottom: '2.5rem' }}>
        <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--indigo)', marginBottom: '0.4rem' }}>SMART PRINT</p>
        <h1 style={{ fontSize: 'clamp(1.7rem, 3vw, 2.4rem)', fontWeight: 900, letterSpacing: '-0.03em' }}>Upload &amp; Print</h1>
        <p style={{ color: 'var(--text-sec)', marginTop: '0.35rem' }}>Configure options, see live printer availability, and pay.</p>
      </motion.div>

      {/* Login gate */}
      {!user && (
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          style={{ padding: '1.25rem 1.5rem', borderRadius: 'var(--r-xl)', background: 'rgba(79,70,229,0.07)', border: '1.5px solid var(--border-brand)', color: 'var(--text-sec)', marginBottom: '2rem', fontSize: '0.92rem' }}>
          🔐 Please <a href="/login" style={{ color: 'var(--indigo)', fontWeight: 700 }}>log in</a> to submit a print job.
        </motion.div>
      )}

      {/* Live printer board */}
      {user && printers.length > 0 && <PrinterBoard printers={printers} />}

      {/* Upload zone */}
      <motion.div
        initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0, scale: dragging ? 1.02 : 1 }} transition={{ delay: 0.1, duration: 0.5 }}
        onDragEnter={() => setDragging(true)} onDragLeave={() => setDragging(false)} onDrop={handleDrop} onDragOver={e => e.preventDefault()}
        style={{
          borderRadius: 'var(--r-xl)',
          border: `2px dashed ${dragging ? 'var(--indigo)' : file ? '#10b981' : 'var(--border-brand)'}`,
          background: dragging ? 'rgba(79,70,229,0.05)' : file ? 'rgba(16,185,129,0.04)' : 'var(--gradient-subtle)',
          padding: 'clamp(2.5rem, 6vw, 4rem) 2rem', textAlign: 'center', cursor: 'pointer',
          transition: 'border-color 0.2s, background 0.2s', marginBottom: '2rem', position: 'relative', overflow: 'hidden',
        }}
        onClick={() => document.getElementById('file-input')?.click()}
      >
        <input id="file-input" type="file" accept=".pdf,.png,.jpg,.jpeg" style={{ display: 'none' }}
          onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
        <AnimatePresence mode="wait">
          {file ? (
            <motion.div key="file" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '0.75rem' }}>✅</div>
              <p style={{ fontWeight: 800, fontSize: '1.05rem', color: '#059669', marginBottom: '0.3rem' }}>{file.name}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>{(file.size / 1024).toFixed(1)} KB — click to change</p>
            </motion.div>
          ) : (
            <motion.div key="empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <motion.div animate={{ y: dragging ? -8 : 0 }} transition={{ type: 'spring', stiffness: 300, damping: 18 }} style={{ fontSize: '3rem', marginBottom: '0.9rem' }}>📄</motion.div>
              <p style={{ fontWeight: 800, fontSize: '1.1rem', marginBottom: '0.4rem' }}>{dragging ? 'Drop it!' : 'Drag & drop your file here'}</p>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>PDF, PNG, JPG — up to 20 MB</p>
              <motion.span whileHover={{ scale: 1.03 }}
                style={{ display: 'inline-block', marginTop: '1.25rem', padding: '0.5rem 1.4rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)', color: '#fff', fontWeight: 700, fontSize: '0.88rem', boxShadow: 'var(--shadow-brand)', cursor: 'pointer' }}>
                Browse files
              </motion.span>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Config */}
      <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.07, delayChildren: 0.2 } } }} style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '2rem' }}>

        {/* Page size */}
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
          <PageSizeSelector value={pageSize} onChange={setPageSize} disabled={!file} />
        </motion.div>

        {/* Main options */}
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px,1fr))', gap: '1rem' }}>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)' }}>Color Mode</label>
            <select disabled={!file} value={colorMode} onChange={e => setColorMode(e.target.value as ColorMode)}
              style={{ padding: '0.65rem 0.9rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: !file ? 'var(--surface-2)' : 'var(--surface)', color: !file ? 'var(--text-muted)' : 'var(--text-pri)', fontSize: '0.9rem', cursor: !file ? 'not-allowed' : 'pointer', opacity: !file ? 0.5 : 1 }}>
              <option value="bw">Black &amp; White</option>
              <option value="color">Color</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)' }}>Orientation</label>
            <select disabled={!file} value={orientation} onChange={e => setOrientation(e.target.value as Orientation)}
              style={{ padding: '0.65rem 0.9rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: !file ? 'var(--surface-2)' : 'var(--surface)', color: !file ? 'var(--text-muted)' : 'var(--text-pri)', fontSize: '0.9rem', cursor: !file ? 'not-allowed' : 'pointer', opacity: !file ? 0.5 : 1 }}>
              <option value="portrait">Portrait</option>
              <option value="landscape">Landscape</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)' }}>Paper Type</label>
            <select disabled={!file} value={paperType} onChange={e => setPaperType(e.target.value as PaperType)}
              style={{ padding: '0.65rem 0.9rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: !file ? 'var(--surface-2)' : 'var(--surface)', color: !file ? 'var(--text-muted)' : 'var(--text-pri)', fontSize: '0.9rem', cursor: !file ? 'not-allowed' : 'pointer', opacity: !file ? 0.5 : 1 }}>
              <option value="normal">Normal</option>
              <option value="glossy">Glossy (+₹5/pg)</option>
              <option value="thick">Thick/Card (+₹8/pg)</option>
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)' }}>Copies</label>
            <select disabled={!file} value={copies} onChange={e => setCopies(Number(e.target.value))}
              style={{ padding: '0.65rem 0.9rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: !file ? 'var(--surface-2)' : 'var(--surface)', color: !file ? 'var(--text-muted)' : 'var(--text-pri)', fontSize: '0.9rem', cursor: !file ? 'not-allowed' : 'pointer', opacity: !file ? 0.5 : 1 }}>
              {[1, 2, 3, 5, 10, 20, 50].map(n => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)' }}>Total Pages</label>
            <input type="number" min={1} max={500} disabled={!file} value={totalPages}
              onChange={e => setTotalPages(Math.max(1, parseInt(e.target.value, 10) || 1))}
              style={{ padding: '0.65rem 0.9rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: !file ? 'var(--surface-2)' : 'var(--surface)', color: !file ? 'var(--text-muted)' : 'var(--text-pri)', fontSize: '0.9rem', cursor: !file ? 'not-allowed' : 'text', opacity: !file ? 0.5 : 1, outline: 'none' }} />
          </div>
        </motion.div>

        {/* Toggle options */}
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
          style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
          {[
            { key: 'duplex',     checked: duplex,     set: setDuplex,     label: '🔄 Double-sided (duplex)' },
            { key: 'lamination', checked: lamination, set: setLamination, label: '✨ Lamination (+₹15/pg)' },
          ].map(({ key, checked, set, label }) => (
            <label key={key} style={{
              display: 'flex', alignItems: 'center', gap: '0.5rem',
              padding: '0.6rem 1rem', borderRadius: 'var(--r-lg)',
              border: `1.5px solid ${checked && file ? 'var(--indigo)' : 'var(--border-strong)'}`,
              background: checked && file ? 'rgba(79,70,229,0.08)' : 'var(--surface)',
              cursor: file ? 'pointer' : 'not-allowed', opacity: file ? 1 : 0.5,
              fontSize: '0.88rem', fontWeight: 600,
              transition: 'border-color 0.15s, background 0.15s',
            }}>
              <input type="checkbox" disabled={!file} checked={checked} onChange={e => set(e.target.checked)}
                style={{ accentColor: 'var(--indigo)', width: '16px', height: '16px' }} />
              {label}
            </label>
          ))}
        </motion.div>

        {/* Print range */}
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}
          style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)' }}>Print Range</label>
          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            {(['all', 'custom'] as PrintRange[]).map(r => (
              <button key={r} disabled={!file} onClick={() => setPrintRange(r)}
                style={{
                  padding: '0.5rem 1rem', borderRadius: 'var(--r-pill)',
                  border: `1.5px solid ${printRange === r && file ? 'var(--indigo)' : 'var(--border-strong)'}`,
                  background: printRange === r && file ? 'rgba(79,70,229,0.1)' : 'var(--surface)',
                  color: printRange === r && file ? 'var(--indigo)' : 'var(--text-sec)',
                  fontWeight: 700, fontSize: '0.82rem', cursor: file ? 'pointer' : 'not-allowed',
                  opacity: file ? 1 : 0.5, transition: 'border-color 0.15s, background 0.15s',
                }}>
                {r === 'all' ? '📄 All pages' : '📌 Custom range'}
              </button>
            ))}
            {printRange === 'custom' && file && (
              <motion.div initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}
                style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>pages</span>
                <input type="number" min={1} max={totalPages} value={pageFrom}
                  onChange={e => setPageFrom(Math.max(1, parseInt(e.target.value, 10) || 1))}
                  style={{ width: '60px', padding: '0.45rem 0.5rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontSize: '0.88rem', outline: 'none', textAlign: 'center' }} />
                <span style={{ fontSize: '0.82rem', color: 'var(--text-muted)' }}>to</span>
                <input type="number" min={pageFrom} max={totalPages} value={pageTo}
                  onChange={e => setPageTo(Math.max(pageFrom, parseInt(e.target.value, 10) || pageFrom))}
                  style={{ width: '60px', padding: '0.45rem 0.5rem', borderRadius: 'var(--r-sm)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontSize: '0.88rem', outline: 'none', textAlign: 'center' }} />
              </motion.div>
            )}
          </div>
        </motion.div>

        {/* Notes */}
        <motion.div variants={{ hidden: { opacity: 0, y: 16 }, visible: { opacity: 1, y: 0, transition: { duration: 0.4 } } }}>
          <label style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)', display: 'block', marginBottom: '6px' }}>
            Notes for printer staff (optional)
          </label>
          <textarea disabled={!file} value={notes} onChange={e => setNotes(e.target.value.slice(0, 500))}
            placeholder="e.g. Please staple, collect from counter 2, urgent…" rows={2}
            style={{
              width: '100%', padding: '0.65rem 0.9rem', borderRadius: 'var(--r-md)',
              border: '1.5px solid var(--border-strong)', background: !file ? 'var(--surface-2)' : 'var(--surface)',
              color: !file ? 'var(--text-muted)' : 'var(--text-pri)', fontSize: '0.88rem',
              resize: 'vertical', outline: 'none', opacity: !file ? 0.5 : 1, fontFamily: 'var(--font-body)', boxSizing: 'border-box',
            }} />
        </motion.div>
      </motion.div>

      {/* Pricing chips */}
      {file && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
          {[
            { label: 'B&W A4',  price: '₹1.50/pg' }, { label: 'B&W A3',    price: '₹3.00/pg' },
            { label: 'Color A4', price: '₹8.00/pg' }, { label: 'Color A3',  price: '₹16.00/pg' },
            { label: 'Glossy',   price: '+₹5/pg'   }, { label: 'Thick',     price: '+₹8/pg'    },
            { label: 'Laminate', price: '+₹15/pg'  },
          ].map(({ label, price }) => (
            <span key={label} style={{ padding: '0.25rem 0.75rem', borderRadius: 'var(--r-pill)', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.76rem', color: 'var(--text-sec)' }}>
              {label}: <strong style={{ color: 'var(--text-pri)' }}>{price}</strong>
            </span>
          ))}
        </motion.div>
      )}

      <AnimatePresence>
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ padding: '0.75rem 1rem', borderRadius: 'var(--r-sm)', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c', fontSize: '0.88rem', marginBottom: '1rem' }}>
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* CTA */}
      <AnimatePresence>
        {file && (
          <motion.div initial={{ opacity: 0, y: 20, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 20, scale: 0.98 }} transition={{ duration: 0.4 }}
            style={{
              padding: '1.5rem 1.75rem', borderRadius: 'var(--r-xl)',
              background: 'linear-gradient(135deg,rgba(79,70,229,0.07) 0%,rgba(124,58,237,0.05) 100%)',
              border: '1px solid var(--border-brand)',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem',
            }}>
            <div>
              <p style={{ fontSize: '0.82rem', color: 'var(--text-sec)', fontWeight: 600, marginBottom: '0.25rem' }}>Estimated total</p>
              <motion.p key={amount} initial={{ opacity: 0.5, y: -4 }} animate={{ opacity: 1, y: 0 }}
                style={{ fontSize: '1.8rem', fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--indigo)' }}>
                ₹{amount.toFixed(2)}
              </motion.p>
              <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>
                {totalPages}pg × {copies} cop{copies !== 1 ? 'ies' : 'y'} · {colorMode === 'bw' ? 'B&W' : 'Color'} {pageSize} · {orientation} · {paperType}{lamination ? ' + lam' : ''}{duplex ? ' · duplex' : ''}
              </p>
            </div>
            <motion.button
              whileHover={!submitting && !!user ? { scale: 1.04, boxShadow: '0 10px 36px rgba(79,70,229,0.38)' } : {}}
              whileTap={!submitting && !!user ? { scale: 0.97 } : {}}
              disabled={submitting || !user} onClick={handleSubmit}
              style={{
                padding: '0.8rem 2rem', borderRadius: 'var(--r-pill)',
                background: (!user || submitting) ? 'var(--surface-2)' : 'var(--gradient-brand)',
                color: (!user || submitting) ? 'var(--text-muted)' : '#fff',
                fontWeight: 800, fontSize: '0.95rem', border: 'none',
                cursor: (!user || submitting) ? 'not-allowed' : 'pointer',
                opacity: (!user || submitting) ? 0.65 : 1,
                boxShadow: (!user || submitting) ? 'none' : 'var(--shadow-brand)',
                transition: 'background 0.2s',
              }}>
              {submitting ? 'Submitting…' : !user ? 'Log in to order' : 'Place Print Order →'}
            </motion.button>
          </motion.div>
        )}
      </AnimatePresence>

      {!file && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          style={{ textAlign: 'center', color: 'var(--text-muted)', fontSize: '0.85rem', marginTop: '1rem' }}>
          Upload a file to unlock configuration and pricing.
        </motion.p>
      )}

      {/* Past jobs */}
      {user && (
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.35 }} style={{ marginTop: '3.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
            <p style={{ fontSize: '0.78rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase', color: 'var(--indigo)' }}>
              Your Recent Print Jobs
            </p>
            <a href="/dashboard/print-jobs" style={{ fontSize: '0.8rem', color: 'var(--indigo)', fontWeight: 600, textDecoration: 'none' }}>View all →</a>
          </div>
          {loadingJobs ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {[1, 2].map(i => <div key={i} style={{ height: '64px', borderRadius: 'var(--r-lg)', background: 'var(--surface-2)' }} />)}
            </div>
          ) : pastJobs.length === 0 ? (
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem' }}>No print jobs yet.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {pastJobs.slice(0, 5).map((job, idx) => (
                <motion.div key={job.id} initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: idx * 0.05 }}
                  style={{ padding: '0.85rem 1.1rem', borderRadius: 'var(--r-lg)', background: 'var(--surface)', border: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '1rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.4rem' }}>📄</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{job.file_name}</p>
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginTop: '0.15rem' }}>
                      {job.color_mode === 'bw' ? 'B&W' : 'Color'} · {job.page_size} · {job.total_pages}pg × {job.copies}
                      {(job as any).orientation === 'landscape' ? ' · Landscape' : ''}
                      {(job as any).duplex ? ' · Duplex' : ''}
                      {job.lamination ? ' · Laminated' : ''}
                      {' · '}₹{job.amount}
                    </p>
                  </div>
                  <StatusBadge status={job.status} />
                </motion.div>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </div>
  );
}
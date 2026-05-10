'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Printer {
  id:           string;
  name:         string;
  capabilities: string;
  status:       'active' | 'inactive' | 'error' | 'maintenance';
  location:     string | null;
  queue_depth:  number;
}

interface QueueJob {
  id:           string;
  file_name:    string;
  file_url:     string;
  color_mode:   string;
  page_size:    string;
  copies:       number;
  total_pages:  number;
  lamination:   boolean;
  orientation:  string;
  duplex:       boolean;
  paper_type:   string;
  print_range:  string;
  page_from:    number | null;
  page_to:      number | null;
  notes:        string | null;
  amount:       string;
  status:       string;
  user_name:    string;
  user_email:   string;
  created_at:   string;
}

const STATUS_COLORS: Record<string, { bg: string; text: string }> = {
  paid:       { bg: 'rgba(59,130,246,0.12)',  text: '#1d4ed8' },
  processing: { bg: 'rgba(124,58,237,0.12)',  text: '#6d28d9' },
  printed:    { bg: 'rgba(16,185,129,0.12)',  text: '#047857' },
  ready:      { bg: 'rgba(16,185,129,0.18)',  text: '#065f46' },
  failed:     { bg: 'rgba(239,68,68,0.12)',   text: '#b91c1c' },
};

function Badge({ label, bg, text }: { label: string; bg: string; text: string }) {
  return (
    <span style={{ padding: '0.2rem 0.7rem', borderRadius: '999px', background: bg, color: text, fontSize: '0.75rem', fontWeight: 700, textTransform: 'capitalize' }}>
      {label}
    </span>
  );
}

// ─── Print Client Station Page ────────────────────────────────────────────────

export default function PrintClientPage() {
  const [apiKey,    setApiKey]    = useState('');
  const [printerId, setPrinterId] = useState('');
  const [printers,  setPrinters]  = useState<Printer[]>([]);
  const [queue,     setQueue]     = useState<QueueJob[]>([]);
  const [connected, setConnected] = useState(false);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [updating,  setUpdating]  = useState<string | null>(null); // jobId being updated
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const pollRef    = useRef<ReturnType<typeof setInterval> | null>(null);
  const savedKey   = useRef('');
  const autoTried  = useRef(false);

  // ── Load printers + auto-connect if credentials saved in localStorage ───────
  useEffect(() => {
    const savedApiKey    = localStorage.getItem('cc_print_api_key') ?? '';
    const savedPrinterId = localStorage.getItem('cc_print_printer_id') ?? '';
    if (savedApiKey)    setApiKey(savedApiKey);
    if (savedPrinterId) setPrinterId(savedPrinterId);

    fetch('/api/admin/printers', { credentials: 'include' })
      .then(r => r.json())
      .then(d => {
        if (d.success) setPrinters(d.data || []);
        // Auto-connect once printers are loaded, if creds are saved
        if (savedApiKey && savedPrinterId && !autoTried.current) {
          autoTried.current = true;
          autoConnect(savedApiKey, savedPrinterId);
        }
      })
      .catch(() => {});
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const autoConnect = async (key: string, pid: string) => {
    savedKey.current = key;
    try {
      const r = await fetch(`/api/print-client/queue?printer_id=${pid}`, {
        headers: { 'x-api-key': key },
      });
      const d = await r.json();
      if (r.ok && d.success) {
        setQueue(d.data || []);
        setConnected(true);
        pollRef.current = setInterval(() => fetchQueueWith(key, pid), 8000);
      }
      // If auto-connect fails, just stay on the login screen — no error shown
    } catch { /* silent */ }
  };

  // fetchQueueWith — uses explicit params (for polling closures)
  const fetchQueueWith = useCallback(async (key: string, pid: string) => {
    try {
      const r = await fetch(`/api/print-client/queue?printer_id=${pid}`, {
        headers: { 'x-api-key': key },
      });
      const d = await r.json();
      if (d.success) {
        setQueue(d.data || []);
        setError(null);
      } else {
        setError(d.message || 'Failed to fetch queue');
      }
    } catch {
      setError('Connection error — retrying…');
    }
  }, []);

  const fetchQueue = useCallback(async () => {
    fetchQueueWith(savedKey.current, printerId);
  }, [fetchQueueWith, printerId]);

  const connect = async () => {
    if (!apiKey.trim() || !printerId) {
      setError('Select a printer and enter API key.');
      return;
    }
    setLoading(true);
    setError(null);
    const key = apiKey.trim();
    savedKey.current = key;
    try {
      const r = await fetch(`/api/print-client/queue?printer_id=${printerId}`, {
        headers: { 'x-api-key': key },
      });
      const d = await r.json();
      if (!r.ok || !d.success) {
        setError(d.message || 'Invalid API key or printer ID');
        setLoading(false);
        return;
      }
      // Save to localStorage so next launch auto-connects
      localStorage.setItem('cc_print_api_key',    key);
      localStorage.setItem('cc_print_printer_id', printerId);
      setQueue(d.data || []);
      setConnected(true);
      pollRef.current = setInterval(() => fetchQueueWith(key, printerId), 8000);
    } catch {
      setError('Could not connect. Check API key and network.');
    }
    setLoading(false);
  };

  const disconnect = (forget = false) => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (forget) {
      localStorage.removeItem('cc_print_api_key');
      localStorage.removeItem('cc_print_printer_id');
      setApiKey('');
      setPrinterId('');
    }
    setConnected(false);
    setQueue([]);
    setError(null);
  };

  useEffect(() => () => { if (pollRef.current) clearInterval(pollRef.current); }, []);

  const updateStatus = async (jobId: string, status: 'processing' | 'printed' | 'failed', errorMessage?: string) => {
    setUpdating(jobId);
    try {
      const r = await fetch(`/api/print-client/jobs/${jobId}/status`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json', 'x-api-key': savedKey.current },
        body:    JSON.stringify({ status, error_message: errorMessage }),
      });
      const d = await r.json();
      if (d.success) {
        setStatusMsg(`Job marked as ${status}`);
        setTimeout(() => setStatusMsg(null), 3000);
        await fetchQueue();
      } else {
        setError(d.message || 'Failed to update status');
      }
    } catch {
      setError('Network error when updating status');
    }
    setUpdating(null);
  };

  const selectedPrinter = printers.find(p => p.id === printerId);

  // ─── Login / setup screen ───────────────────────────────────────────────────
  if (!connected) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--surface)', padding: '2rem' }}>
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            width: '100%', maxWidth: '440px',
            background: 'var(--surface)',
            borderRadius: 'var(--r-xl)',
            border: '1.5px solid var(--border-brand)',
            padding: '2.5rem',
            boxShadow: 'var(--shadow-lg)',
          }}
        >
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <div style={{ fontSize: '3rem', marginBottom: '0.75rem' }}>🖨️</div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.03em', marginBottom: '0.4rem' }}>
              Print Station
            </h1>
            <p style={{ color: 'var(--text-sec)', fontSize: '0.88rem' }}>
              Connect to a printer to manage and process print jobs.
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)', marginBottom: '6px' }}>
                Select Printer
              </label>
              <select value={printerId} onChange={e => setPrinterId(e.target.value)}
                style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontSize: '0.9rem', outline: 'none' }}>
                <option value="">— choose a printer —</option>
                {printers.map(p => (
                  <option key={p.id} value={p.id}>
                    {p.name}{p.location ? ` (${p.location})` : ''} — {p.status}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-sec)', marginBottom: '6px' }}>
                API Key
              </label>
              <input
                type="password"
                value={apiKey}
                onChange={e => setApiKey(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && connect()}
                placeholder="Enter print client API key…"
                style={{ width: '100%', padding: '0.7rem 0.9rem', borderRadius: 'var(--r-md)', border: '1.5px solid var(--border-strong)', background: 'var(--surface)', fontSize: '0.9rem', outline: 'none', boxSizing: 'border-box' }}
              />
            </div>

            {error && (
              <div style={{ padding: '0.7rem 1rem', borderRadius: 'var(--r-md)', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c', fontSize: '0.85rem' }}>
                {error}
              </div>
            )}

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.97 }}
              onClick={connect}
              disabled={loading}
              style={{
                padding: '0.85rem', borderRadius: 'var(--r-pill)', background: 'var(--gradient-brand)',
                color: '#fff', fontWeight: 800, fontSize: '0.95rem', border: 'none', cursor: loading ? 'not-allowed' : 'pointer',
                opacity: loading ? 0.7 : 1, boxShadow: 'var(--shadow-brand)',
              }}
            >
              {loading ? 'Connecting…' : '🔌 Connect to Printer'}
            </motion.button>
          </div>
        </motion.div>
      </div>
    );
  }

  // ─── Connected: Queue Management ────────────────────────────────────────────
  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', padding: 'clamp(2rem, 5vw, 3.5rem) clamp(1rem, 4vw, 2rem)' }}>

      {/* Station header */}
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginBottom: '0.25rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🖨️</span>
            <h1 style={{ fontSize: '1.4rem', fontWeight: 900, letterSpacing: '-0.03em' }}>
              {selectedPrinter?.name ?? 'Print Station'}
            </h1>
            <span style={{
              padding: '0.2rem 0.65rem', borderRadius: '999px', fontSize: '0.72rem', fontWeight: 700,
              background: selectedPrinter?.status === 'active' ? 'rgba(16,185,129,0.12)' : 'rgba(234,179,8,0.12)',
              color:      selectedPrinter?.status === 'active' ? '#047857' : '#b45309',
            }}>{selectedPrinter?.status ?? 'connected'}</span>
          </div>
          {selectedPrinter?.location && <p style={{ color: 'var(--text-muted)', fontSize: '0.82rem' }}>📍 {selectedPrinter.location}</p>}
          <p style={{ color: 'var(--text-sec)', fontSize: '0.82rem', marginTop: '0.15rem' }}>
            {queue.length} job{queue.length !== 1 ? 's' : ''} in queue · polling every 8s
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={fetchQueue}
            style={{ padding: '0.55rem 1.1rem', borderRadius: 'var(--r-pill)', background: 'var(--surface-2)', border: '1.5px solid var(--border-strong)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: 'var(--text-pri)' }}>
            🔄 Refresh
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => disconnect(false)}
            style={{ padding: '0.55rem 1.1rem', borderRadius: 'var(--r-pill)', background: 'rgba(239,68,68,0.1)', border: '1.5px solid rgba(239,68,68,0.3)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: '#b91c1c' }}>
            ⏏ Disconnect
          </motion.button>
          <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} onClick={() => disconnect(true)}
            title="Disconnect and clear saved credentials"
            style={{ padding: '0.55rem 1.1rem', borderRadius: 'var(--r-pill)', background: 'rgba(239,68,68,0.06)', border: '1.5px solid rgba(239,68,68,0.2)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', color: '#ef4444' }}>
            🗑 Forget
          </motion.button>
        </div>
      </motion.div>

      {/* Status / error banners */}
      <AnimatePresence>
        {statusMsg && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ padding: '0.7rem 1rem', borderRadius: 'var(--r-md)', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.25)', color: '#047857', fontSize: '0.88rem', marginBottom: '1rem' }}>
            ✅ {statusMsg}
          </motion.div>
        )}
        {error && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            style={{ padding: '0.7rem 1rem', borderRadius: 'var(--r-md)', background: 'rgba(239,68,68,0.09)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c', fontSize: '0.88rem', marginBottom: '1rem' }}>
            ⚠️ {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Queue */}
      {queue.length === 0 ? (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          style={{ textAlign: 'center', padding: '4rem 2rem', color: 'var(--text-muted)' }}>
          <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>✅</div>
          <p style={{ fontWeight: 700, fontSize: '1.1rem', marginBottom: '0.5rem' }}>Queue is empty</p>
          <p style={{ fontSize: '0.88rem' }}>No paid jobs assigned to this printer.</p>
        </motion.div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {queue.map((job, idx) => (
            <motion.div
              key={job.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.06 }}
              style={{
                borderRadius: 'var(--r-xl)',
                border: `1.5px solid ${job.status === 'processing' ? 'var(--border-brand)' : 'var(--border)'}`,
                background: job.status === 'processing' ? 'linear-gradient(135deg,rgba(79,70,229,0.05) 0%,rgba(124,58,237,0.03) 100%)' : 'var(--surface)',
                padding: '1.25rem 1.5rem',
                boxShadow: job.status === 'processing' ? 'var(--shadow-brand)' : 'none',
              }}
            >
              {/* Job header */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '1rem', marginBottom: '1rem', flexWrap: 'wrap' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <span style={{ fontSize: '1.2rem' }}>📄</span>
                    <span style={{ fontWeight: 800, fontSize: '0.95rem' }}>{job.file_name}</span>
                    <Badge label={job.status} {...(STATUS_COLORS[job.status] ?? { bg: 'var(--surface-2)', text: 'var(--text-sec)' })} />
                  </div>
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginLeft: '1.7rem' }}>
                    {job.user_name} · {job.user_email}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--indigo)' }}>₹{job.amount}</p>
                  <p style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                    {new Date(job.created_at).toLocaleTimeString()}
                  </p>
                </div>
              </div>

              {/* Print spec chips */}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '1.25rem' }}>
                {[
                  { label: job.color_mode === 'bw' ? '⬛ B&W' : '🎨 Color' },
                  { label: `📐 ${job.page_size}` },
                  { label: `${job.orientation === 'landscape' ? '🔄 Landscape' : '📄 Portrait'}` },
                  { label: `📋 ${job.total_pages}pg` },
                  { label: `×${job.copies} copies` },
                  ...(job.duplex           ? [{ label: '🔄 Duplex' }]     : []),
                  ...(job.lamination       ? [{ label: '✨ Laminate' }]   : []),
                  ...(job.paper_type !== 'normal' ? [{ label: `🗒 ${job.paper_type}` }] : []),
                  ...(job.print_range === 'custom' ? [{ label: `📌 pg ${job.page_from}–${job.page_to}` }] : []),
                ].map(({ label }, i) => (
                  <span key={i} style={{ padding: '0.2rem 0.65rem', borderRadius: '999px', background: 'var(--surface-2)', border: '1px solid var(--border)', fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-sec)' }}>
                    {label}
                  </span>
                ))}
              </div>

              {/* Notes */}
              {job.notes && (
                <div style={{ padding: '0.6rem 0.9rem', borderRadius: 'var(--r-md)', background: 'rgba(234,179,8,0.07)', border: '1px solid rgba(234,179,8,0.2)', fontSize: '0.82rem', color: '#92400e', marginBottom: '1rem' }}>
                  📝 <strong>Note:</strong> {job.notes}
                </div>
              )}

              {/* File link */}
              <div style={{ marginBottom: '1rem' }}>
                <a href={job.file_url} target="_blank" rel="noreferrer"
                  style={{ fontSize: '0.82rem', color: 'var(--indigo)', fontWeight: 700, textDecoration: 'underline' }}>
                  ⬇ Download file to print
                </a>
              </div>

              {/* Action buttons */}
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                {job.status === 'paid' && (
                  <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                    disabled={updating === job.id}
                    onClick={() => updateStatus(job.id, 'processing')}
                    style={{
                      padding: '0.6rem 1.25rem', borderRadius: 'var(--r-pill)',
                      background: 'var(--gradient-brand)', color: '#fff', fontWeight: 700, fontSize: '0.85rem',
                      border: 'none', cursor: updating === job.id ? 'not-allowed' : 'pointer',
                      opacity: updating === job.id ? 0.6 : 1, boxShadow: 'var(--shadow-brand)',
                    }}>
                    {updating === job.id ? 'Updating…' : '▶ Start Printing'}
                  </motion.button>
                )}
                {job.status === 'processing' && (
                  <>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      disabled={updating === job.id}
                      onClick={() => updateStatus(job.id, 'printed')}
                      style={{
                        padding: '0.6rem 1.25rem', borderRadius: 'var(--r-pill)',
                        background: 'rgba(16,185,129,0.12)', color: '#047857', fontWeight: 700, fontSize: '0.85rem',
                        border: '1.5px solid rgba(16,185,129,0.3)', cursor: updating === job.id ? 'not-allowed' : 'pointer',
                        opacity: updating === job.id ? 0.6 : 1,
                      }}>
                      ✅ Mark Printed
                    </motion.button>
                    <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}
                      disabled={updating === job.id}
                      onClick={() => { const msg = window.prompt('Reason for failure?') || undefined; updateStatus(job.id, 'failed', msg); }}
                      style={{
                        padding: '0.6rem 1.25rem', borderRadius: 'var(--r-pill)',
                        background: 'rgba(239,68,68,0.1)', color: '#b91c1c', fontWeight: 700, fontSize: '0.85rem',
                        border: '1.5px solid rgba(239,68,68,0.3)', cursor: updating === job.id ? 'not-allowed' : 'pointer',
                        opacity: updating === job.id ? 0.6 : 1,
                      }}>
                      ✕ Mark Failed
                    </motion.button>
                  </>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}

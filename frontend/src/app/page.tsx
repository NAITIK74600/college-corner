'use client';

import Link from 'next/link';
import { useRef } from 'react';
import {
  motion,
  useScroll,
  useTransform,
  useInView,
} from 'framer-motion';

/* ═══════════════════════════════════════════════════════════
   MOTION HELPERS
═══════════════════════════════════════════════════════════ */
const E  = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const ESp = [0.34, 1.56, 0.64, 1] as [number, number, number, number];

function FadeUp({
  children, delay = 0, className, style,
}: {
  children: React.ReactNode; delay?: number;
  className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-60px' });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial={{ opacity: 0, y: 36, filter: 'blur(4px)' }}
      animate={inView ? { opacity: 1, y: 0, filter: 'blur(0px)' } : {}}
      transition={{ duration: 0.65, delay, ease: E }}
    >
      {children}
    </motion.div>
  );
}

function Stagger({
  children, className, style,
}: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const inView = useInView(ref, { once: true, margin: '-40px' });
  return (
    <motion.div ref={ref} className={className} style={style}
      initial="hidden"
      animate={inView ? 'visible' : 'hidden'}
      variants={{ hidden: {}, visible: { transition: { staggerChildren: 0.09, delayChildren: 0.05 } } }}
    >
      {children}
    </motion.div>
  );
}

const itemV = {
  hidden:  { opacity: 0, y: 28, filter: 'blur(6px)' },
  visible: { opacity: 1, y: 0,  filter: 'blur(0px)', transition: { duration: 0.55, ease: E } },
};

/* ═══════════════════════════════════════════════════════════
   DATA
═══════════════════════════════════════════════════════════ */
const stats = [
  { value: '2 min', label: 'Campus delivery', sub: 'avg time'            },
  { value: '₹0',    label: 'Delivery fee',    sub: 'orders over ₹499'    },
  { value: '24/7',  label: 'Print queue',     sub: 'always active'       },
  { value: '100%',  label: 'Digital',         sub: 'UPI · Card · Wallet' },
];

const features = [
  {
    tag: 'Quick Commerce', icon: '🛒', size: 'large',
    title: 'Your campus store, at your fingertips',
    desc: 'Browse stationery, tech accessories, lab supplies and snacks. Add to cart, pay online — delivered to your dorm in minutes.',
    accent: '#4F46E5', href: '/store',
  },
  {
    tag: 'Smart Print', icon: '🖨️', size: 'medium',
    title: 'Upload. Configure. Print.',
    desc: 'PDF or image. B&W or color. A4/A3. Lamination. Pay online. Smart routing to the fastest printer.',
    accent: '#7c3aed', href: '/print',
  },
  {
    tag: 'Live Tracking', icon: '⚡', size: 'medium',
    title: 'Know before you go',
    desc: 'Real-time status: Pending → Processing → Ready. Never waste a trip to the counter.',
    accent: '#FF7F7F', href: '/dashboard',
  },
  {
    tag: 'Wallet', icon: '💳', size: 'small',
    title: 'One balance, everything',
    desc: 'Top up once, spend across orders and prints. Instant refunds.',
    accent: '#2dd4bf', href: '/dashboard',
  },
  {
    tag: 'Security', icon: '🔒', size: 'small',
    title: 'Auto-deleted post-print',
    desc: 'Your files are encrypted at rest and permanently wiped after printing.',
    accent: '#34d058', href: '/print',
  },
];

const steps = [
  { num: '01', title: 'Create account',        desc: 'Sign up free in 30 seconds. No credit card needed.'              },
  { num: '02', title: 'Add to cart or upload', desc: 'Browse products or upload your document for printing.'            },
  { num: '03', title: 'Pay securely',           desc: 'Razorpay checkout — UPI, card, wallet. All accepted.'             },
  { num: '04', title: 'Delivered or ready',    desc: 'Track live. Pickup at counter or get it delivered on campus.'     },
];

/* ═══════════════════════════════════════════════════════════
   PAGE
═══════════════════════════════════════════════════════════ */
export default function HomePage() {
  const { scrollY } = useScroll();

  /* ── Parallax: each blob moves at a different rate ── */
  const blob1Y    = useTransform(scrollY, [0, 700], [0, -140]);  // large indigo — top-right
  const blob2Y    = useTransform(scrollY, [0, 700], [0, -80]);   // coral — bottom-left
  const blob3Y    = useTransform(scrollY, [0, 700], [0, -200]);  // mint — top-left (fastest)
  const blob4Y    = useTransform(scrollY, [0, 700], [0, -50]);   // peach — center-right (slowest)
  const blob5Y    = useTransform(scrollY, [0, 700], [0, -115]);  // violet — center
  const heroFade  = useTransform(scrollY, [0, 400], [1, 0]);
  const heroScale = useTransform(scrollY, [0, 400], [1, 0.96]);

  return (
    <div style={{ overflow: 'hidden' }}>

      {/* ════════════════════════════════════════════════════════
          HERO — parallax organic blobs + Urbanist headline
      ════════════════════════════════════════════════════════ */}
      <section style={{
        position: 'relative',
        minHeight: '100vh',
        display: 'flex', alignItems: 'center',
        padding: 'clamp(6rem, 12vw, 10rem) clamp(1.5rem, 6vw, 4rem)',
        background: 'linear-gradient(165deg, #fafaf8 0%, #f9fafb 55%, #fdf8ff 100%)',
        overflow: 'hidden',
      }}>

        {/* ── Blob 1: large indigo, top-right (parallax) ── */}
        <motion.div style={{
          position: 'absolute', top: '-12%', right: '-12%',
          width: 'clamp(380px, 56vw, 720px)',
          height: 'clamp(340px, 52vw, 660px)',
          background: 'radial-gradient(ellipse, rgba(79,70,229,0.13) 0%, rgba(99,102,241,0.05) 55%, transparent 100%)',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          y: blob1Y,
          pointerEvents: 'none',
        }} />

        {/* ── Blob 2: coral/peach, bottom-left (parallax) ── */}
        <motion.div style={{
          position: 'absolute', bottom: '2%', left: '-10%',
          width: 'clamp(260px, 40vw, 520px)',
          height: 'clamp(240px, 36vw, 480px)',
          background: 'radial-gradient(ellipse, rgba(255,127,127,0.15) 0%, rgba(255,203,164,0.07) 55%, transparent 100%)',
          borderRadius: '40% 60% 70% 30% / 40% 70% 30% 60%',
          y: blob2Y,
          pointerEvents: 'none',
        }} />

        {/* ── Blob 3: mint, top-left (parallax — fastest) ── */}
        <motion.div style={{
          position: 'absolute', top: '8%', left: '4%',
          width: 'clamp(140px, 20vw, 280px)',
          height: 'clamp(130px, 18vw, 260px)',
          background: 'radial-gradient(ellipse, rgba(152,255,152,0.18) 0%, rgba(45,212,191,0.06) 60%, transparent 100%)',
          borderRadius: '30% 70% 50% 50% / 50% 40% 60% 50%',
          y: blob3Y,
          pointerEvents: 'none',
        }} />

        {/* ── Blob 4: peach, center-right (parallax — slowest) ── */}
        <motion.div style={{
          position: 'absolute', top: '48%', right: '6%',
          width: 'clamp(100px, 15vw, 210px)',
          height: 'clamp(90px, 13vw, 190px)',
          background: 'radial-gradient(ellipse, rgba(255,203,164,0.22) 0%, rgba(245,154,95,0.08) 60%, transparent 100%)',
          borderRadius: '70% 30% 60% 40% / 50% 60% 40% 50%',
          y: blob4Y,
          pointerEvents: 'none',
        }} />

        {/* ── Blob 5: violet, center (parallax) ── */}
        <motion.div style={{
          position: 'absolute', top: '22%', right: '28%',
          width: 'clamp(90px, 13vw, 190px)',
          height: 'clamp(80px, 11vw, 170px)',
          background: 'radial-gradient(ellipse, rgba(124,58,237,0.11) 0%, transparent 70%)',
          borderRadius: '50% 50% 40% 60% / 60% 40% 60% 40%',
          y: blob5Y,
          pointerEvents: 'none',
        }} />

        {/* ── Subtle dot-grid overlay ── */}
        <div style={{
          position: 'absolute', inset: 0,
          backgroundImage: `
            radial-gradient(circle, rgba(79,70,229,0.12) 1px, transparent 1px)
          `,
          backgroundSize: '32px 32px',
          pointerEvents: 'none',
          opacity: 0.4,
        }} />

        {/* ── Hero content (fades + scales out on scroll) ── */}
        <motion.div style={{
          position: 'relative', zIndex: 2,
          maxWidth: '1280px', margin: '0 auto', width: '100%',
          opacity: heroFade,
          scale: heroScale,
        }}>
          {/* Live badge */}
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.08, ease: ESp }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '0.36rem 1rem',
              borderRadius: 'var(--r-pill)',
              background: 'rgba(255,127,127,0.1)',
              border: '1px solid rgba(255,127,127,0.28)',
              fontSize: '0.76rem', fontWeight: 700,
              color: 'var(--coral-deep)',
              letterSpacing: '0.06em', textTransform: 'uppercase',
              marginBottom: '1.6rem',
              fontFamily: 'var(--font-body)',
            }}
          >
            <span style={{
              width: 7, height: 7, borderRadius: '50%',
              background: 'var(--coral)', display: 'inline-block',
              boxShadow: '0 0 0 3px rgba(255,127,127,0.22)',
              animation: 'pulse-dash 2s ease-in-out infinite',
            }} />
            Now live on campus
          </motion.div>

          {/* Main headline — Urbanist 900 */}
          <motion.h1
            initial={{ opacity: 0, y: 44, filter: 'blur(8px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            transition={{ duration: 0.78, delay: 0.18, ease: E }}
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2.8rem, 7vw, 5.6rem)',
              fontWeight: 900, letterSpacing: '-0.04em', lineHeight: 1.04,
              color: 'var(--text-pri)',
              maxWidth: '840px', marginBottom: '1.6rem',
            }}
          >
            Your campus store,{' '}
            <span style={{
              background: 'linear-gradient(135deg, #4F46E5 0%, #7c3aed 50%, #FF7F7F 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text',
            }}>
              completely reimagined.
            </span>
          </motion.h1>

          {/* Sub-headline — Inter */}
          <motion.p
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.62, delay: 0.32, ease: E }}
            style={{
              fontFamily: 'var(--font-body)',
              fontSize: 'clamp(1rem, 1.8vw, 1.22rem)',
              color: 'var(--text-sec)', lineHeight: 1.72,
              maxWidth: '520px', marginBottom: '2.4rem',
            }}
          >
            Order stationery, print documents, track everything — all from one sleek app.
            Built exclusively for students.
          </motion.p>

          {/* CTA buttons */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.44, ease: E }}
            style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', marginBottom: '3.5rem' }}
          >
            {/* Primary — coral gradient */}
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <motion.span
                whileHover={{ scale: 1.04, boxShadow: '0 14px 44px rgba(255,127,127,0.5)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '0.85rem 2.1rem',
                  borderRadius: 'var(--r-pill)',
                  background: 'linear-gradient(135deg, #FF7F7F 0%, #FFCBA4 100%)',
                  color: '#fff', fontSize: '1rem', fontWeight: 700,
                  fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em',
                  boxShadow: '0 6px 28px rgba(255,127,127,0.40)',
                  cursor: 'pointer',
                }}
              >
                Get started free
                <span style={{ fontSize: '1.05rem', fontStyle: 'normal' }}>→</span>
              </motion.span>
            </Link>

            {/* Secondary — ghost */}
            <Link href="/store" style={{ textDecoration: 'none' }}>
              <motion.span
                whileHover={{ borderColor: 'var(--indigo)', color: 'var(--indigo)', scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                transition={{ duration: 0.18 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '0.85rem 2.1rem',
                  borderRadius: 'var(--r-pill)',
                  border: '1.5px solid var(--border-strong)',
                  color: 'var(--text-sec)', fontSize: '1rem', fontWeight: 600,
                  fontFamily: 'var(--font-body)', background: 'transparent',
                  cursor: 'pointer',
                }}
              >
                Browse store
              </motion.span>
            </Link>
          </motion.div>

          {/* Stats glass card */}
          <Stagger
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(4, 1fr)',
              background: 'rgba(255,255,255,0.88)',
              backdropFilter: 'blur(24px) saturate(180%)',
              WebkitBackdropFilter: 'blur(24px) saturate(180%)',
              borderRadius: 'var(--r-xl)',
              border: '1px solid rgba(255,255,255,0.65)',
              boxShadow: '0 8px 48px rgba(0,0,0,0.06), 0 2px 12px rgba(0,0,0,0.04)',
              padding: '1.6rem 2rem',
              maxWidth: '640px',
            } as React.CSSProperties}
          >
            {stats.map(({ value, label, sub }, i) => (
              <motion.div key={label} variants={itemV}
                style={{
                  textAlign: 'center',
                  padding: '0 1rem',
                  borderLeft: i > 0 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{
                  fontSize: 'clamp(1.4rem, 3vw, 1.9rem)',
                  fontWeight: 900, fontFamily: 'var(--font-heading)',
                  letterSpacing: '-0.05em', lineHeight: 1.1,
                  background: 'linear-gradient(135deg, #4F46E5 0%, #FF7F7F 100%)',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                }}>
                  {value}
                </div>
                <div style={{ fontSize: '0.78rem', fontWeight: 600, color: 'var(--text-pri)', marginTop: '4px', fontFamily: 'var(--font-body)' }}>
                  {label}
                </div>
                <div style={{ fontSize: '0.68rem', color: 'var(--text-muted)', marginTop: '2px', fontFamily: 'var(--font-body)' }}>
                  {sub}
                </div>
              </motion.div>
            ))}
          </Stagger>
        </motion.div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FEATURES — BENTO GRID
      ════════════════════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(5rem, 8vw, 8rem) clamp(1.5rem, 6vw, 4rem)',
        background: '#ffffff', position: 'relative',
      }}>
        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>

          <FadeUp style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
            <p style={{
              fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--coral-deep)',
              marginBottom: '0.9rem', fontFamily: 'var(--font-body)',
            }}>
              Everything in one place
            </p>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
              fontWeight: 900, letterSpacing: '-0.04em',
              color: 'var(--text-pri)', marginBottom: '1rem',
            }}>
              Designed for student life.
            </h2>
            <p style={{
              fontSize: '1.05rem', color: 'var(--text-sec)',
              maxWidth: '460px', margin: '0 auto', fontFamily: 'var(--font-body)', lineHeight: 1.7,
            }}>
              Every feature you actually need — nothing you don&apos;t.
            </p>
          </FadeUp>

          {/* Bento grid */}
          <Stagger>
            {/* Row 1 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '7fr 5fr',
              gap: '1.25rem', marginBottom: '1.25rem',
            }}>
              {features.slice(0, 2).map((f, i) => (
                <FeatureCard key={f.tag} f={f} large={i === 0} />
              ))}
            </div>
            {/* Row 2 */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '5fr 4fr 3fr',
              gap: '1.25rem',
            }}>
              {features.slice(2, 5).map((f) => (
                <FeatureCard key={f.tag} f={f} large={false} />
              ))}
            </div>
          </Stagger>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          HOW IT WORKS
      ════════════════════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(5rem, 8vw, 8rem) clamp(1.5rem, 6vw, 4rem)',
        background: 'linear-gradient(160deg, #fafaf8 0%, #f9fafb 100%)',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Ambient petal */}
        <div style={{
          position: 'absolute', top: '-20%', right: '-6%',
          width: '40vw', height: '40vw', maxWidth: 560, maxHeight: 560,
          background: 'radial-gradient(ellipse, rgba(255,127,127,0.07) 0%, transparent 70%)',
          borderRadius: '60% 40% 30% 70% / 60% 30% 70% 40%',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: '1280px', margin: '0 auto' }}>
          <FadeUp style={{ textAlign: 'center', marginBottom: 'clamp(3rem, 5vw, 4.5rem)' }}>
            <p style={{
              fontSize: '0.74rem', fontWeight: 700, letterSpacing: '0.1em',
              textTransform: 'uppercase', color: 'var(--indigo)',
              marginBottom: '0.9rem', fontFamily: 'var(--font-body)',
            }}>
              How it works
            </p>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(2rem, 4.5vw, 3.2rem)',
              fontWeight: 900, letterSpacing: '-0.04em', color: 'var(--text-pri)',
            }}>
              Up and running in 4 steps.
            </h2>
          </FadeUp>

          <Stagger style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' } as React.CSSProperties}>
            {steps.map(({ num, title, desc }) => (
              <motion.div key={num} variants={itemV}
                whileHover={{ y: -3, boxShadow: 'var(--shadow-md)' }}
                transition={{ duration: 0.25, ease: E }}
                style={{
                  background: '#fff',
                  borderRadius: 'var(--r-xl)',
                  border: '1px solid var(--border)',
                  padding: '2rem',
                  boxShadow: 'var(--shadow-xs)',
                  position: 'relative', overflow: 'hidden',
                }}
              >
                <div style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '3.5rem', fontWeight: 900,
                  letterSpacing: '-0.07em', lineHeight: 1,
                  background: 'linear-gradient(135deg, rgba(79,70,229,0.14), rgba(255,127,127,0.12))',
                  WebkitBackgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                  backgroundClip: 'text',
                  marginBottom: '1rem', userSelect: 'none',
                }}>
                  {num}
                </div>
                <h3 style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: '1.05rem', fontWeight: 800,
                  letterSpacing: '-0.025em', color: 'var(--text-pri)',
                  marginBottom: '0.5rem',
                }}>
                  {title}
                </h3>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-sec)', lineHeight: 1.68, fontFamily: 'var(--font-body)' }}>
                  {desc}
                </p>
              </motion.div>
            ))}
          </Stagger>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════
          FINAL CTA
      ════════════════════════════════════════════════════════ */}
      <section style={{
        padding: 'clamp(5rem, 8vw, 8rem) clamp(1.5rem, 6vw, 4rem)',
        background: '#fff', position: 'relative', overflow: 'hidden',
      }}>
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '80vw', maxWidth: 900, height: '60vh', maxHeight: 500,
          background: 'radial-gradient(ellipse, rgba(79,70,229,0.07) 0%, rgba(255,127,127,0.05) 50%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <FadeUp>
          <div style={{
            maxWidth: '600px', margin: '0 auto',
            textAlign: 'center', position: 'relative', zIndex: 1,
          }}>
            <div style={{ fontSize: '3rem', marginBottom: '1.2rem', lineHeight: 1 }}>🎓</div>
            <h2 style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 'clamp(1.8rem, 4vw, 3rem)',
              fontWeight: 900, letterSpacing: '-0.04em',
              color: 'var(--text-pri)', marginBottom: '1rem',
            }}>
              Ready to make campus life easier?
            </h2>
            <p style={{
              fontSize: '1.05rem', color: 'var(--text-sec)',
              lineHeight: 1.72, marginBottom: '2.2rem',
              fontFamily: 'var(--font-body)',
            }}>
              Join College Corner — free forever for students. No credit card required.
            </p>
            <Link href="/signup" style={{ textDecoration: 'none' }}>
              <motion.span
                whileHover={{ scale: 1.05, boxShadow: '0 18px 52px rgba(255,127,127,0.48)' }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 380, damping: 24 }}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '10px',
                  padding: '1rem 2.6rem',
                  borderRadius: 'var(--r-pill)',
                  background: 'linear-gradient(135deg, #FF7F7F 0%, #FFCBA4 100%)',
                  color: '#fff', fontSize: '1.05rem', fontWeight: 700,
                  fontFamily: 'var(--font-heading)', letterSpacing: '-0.02em',
                  boxShadow: '0 8px 36px rgba(255,127,127,0.40)',
                  cursor: 'pointer',
                }}
              >
                Create free account →
              </motion.span>
            </Link>
            <p style={{
              marginTop: '1.2rem', fontSize: '0.82rem',
              color: 'var(--text-muted)', fontFamily: 'var(--font-body)',
            }}>
              No credit card required · Free forever for students
            </p>
          </div>
        </FadeUp>
      </section>

    </div>
  );
}

/* ── Feature card sub-component ─────────────────────────────── */
function FeatureCard({ f, large }: {
  f: typeof features[0]; large: boolean;
}) {
  return (
    <motion.div
      variants={itemV}
      whileHover={{ y: -4, boxShadow: '0 20px 60px rgba(0,0,0,0.09)' }}
      transition={{ duration: 0.3, ease: E }}
      style={{
        background: 'var(--surface-2)',
        borderRadius: 'var(--r-xl)',
        border: '1px solid var(--border)',
        padding: large ? '2.5rem' : '2rem',
        boxShadow: 'var(--shadow-sm)',
        position: 'relative', overflow: 'hidden',
        cursor: 'default',
      }}
    >
      {/* Accent glow */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 180, height: 180,
        background: `radial-gradient(circle at 100% 0%, ${f.accent}18 0%, transparent 70%)`,
        pointerEvents: 'none',
      }} />

      <div style={{ fontSize: large ? '2.4rem' : '2rem', marginBottom: '1rem', lineHeight: 1 }}>
        {f.icon}
      </div>
      <span style={{
        display: 'inline-block',
        padding: '0.22rem 0.72rem',
        borderRadius: 'var(--r-pill)',
        background: `${f.accent}16`,
        color: f.accent,
        fontSize: '0.7rem', fontWeight: 700,
        letterSpacing: '0.06em', textTransform: 'uppercase',
        marginBottom: '0.8rem',
        fontFamily: 'var(--font-body)',
      }}>
        {f.tag}
      </span>
      <h3 style={{
        fontFamily: 'var(--font-heading)',
        fontSize: large ? '1.5rem' : '1.12rem',
        fontWeight: 800, letterSpacing: '-0.03em',
        color: 'var(--text-pri)', marginBottom: '0.7rem', lineHeight: 1.2,
      }}>
        {f.title}
      </h3>
      <p style={{
        fontSize: '0.9rem', color: 'var(--text-sec)',
        lineHeight: 1.68, fontFamily: 'var(--font-body)',
        maxWidth: large ? '400px' : '100%',
      }}>
        {f.desc}
      </p>
      {large && (
        <Link href={f.href} style={{ textDecoration: 'none' }}>
          <motion.span
            whileHover={{ x: 4 }}
            transition={{ duration: 0.2 }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '5px',
              marginTop: '1.2rem',
              fontSize: '0.875rem', fontWeight: 700,
              color: f.accent, fontFamily: 'var(--font-body)',
              letterSpacing: '-0.01em',
            }}
          >
            Explore →
          </motion.span>
        </Link>
      )}
    </motion.div>
  );
}

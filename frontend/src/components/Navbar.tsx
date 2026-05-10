'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  motion,
  AnimatePresence,
  useScroll,
  useMotionValueEvent,
} from 'framer-motion';
import { useAuth } from '@/context/AuthContext';
import { useCart } from '@/context/CartContext';
import { useNotifications } from '@/context/NotificationContext';

/* ── Data ────────────────────────────────────────────────────── */
const NAV_LINKS_GUEST   = [
  { href: '/store', label: 'Store' },
  { href: '/print', label: 'Print' },
];
const NAV_LINKS_AUTHED = [
  { href: '/store',     label: 'Store'     },
  { href: '/print',     label: 'Print'     },
  { href: '/dashboard', label: 'Dashboard' },
];
const NAV_LINKS_ADMIN = [
  { href: '/store',     label: 'Store'     },
  { href: '/print',     label: 'Print'     },
  { href: '/dashboard', label: 'Dashboard' },
  { href: '/admin',     label: 'Admin 🛡️'  },
];

/* ── Motion config ───────────────────────────────────────────── */
const E = [0.25, 0.1, 0.25, 1] as [number, number, number, number];
const SP = { type: 'spring' as const, stiffness: 380, damping: 30 };

const navEnter = {
  hidden:  { opacity: 0, y: -20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: E } },
};

const stagger = {
  hidden:  {},
  visible: { transition: { staggerChildren: 0.07, delayChildren: 0.22 } },
};

const linkItem = {
  hidden:  { opacity: 0, y: -10 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.38, ease: E } },
};

const drawerV = {
  hidden:  { opacity: 0, y: -16, scale: 0.96 },
  visible: { opacity: 1, y: 0,  scale: 1,    transition: { duration: 0.28, ease: E } },
  exit:    { opacity: 0, y: -12, scale: 0.97, transition: { duration: 0.2  } },
};

/* ── Component ───────────────────────────────────────────────── */
export default function Navbar() {
  const [scrolled,     setScrolled]     = useState(false);
  const [menuOpen,     setMenuOpen]     = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [bellOpen,     setBellOpen]     = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const bellRef     = useRef<HTMLDivElement>(null);
  const pathname   = usePathname();
  const router     = useRouter();
  const { user, logout } = useAuth();
  const { totalItems, toggleCart } = useCart();
  const { notifications, unreadCount, markAllRead, markOneRead, refresh } = useNotifications();
  const NAV_LINKS  = user?.role === 'admin' ? NAV_LINKS_ADMIN : user ? NAV_LINKS_AUTHED : NAV_LINKS_GUEST;
  const { scrollY } = useScroll();

  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 20));

  /* close dropdown when clicking outside */
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
      if (bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setBellOpen(false);
      }
    }
    if (dropdownOpen || bellOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropdownOpen, bellOpen]);

  /* close everything on route change */
  const handleLinkClick = () => { setMenuOpen(false); setDropdownOpen(false); setBellOpen(false); };

  return (
    <>
      {/* ════════════════ HEADER ════════════════ */}
      <motion.header
        variants={navEnter}
        initial="hidden"
        animate="visible"
        style={{
          position: 'fixed', top: 0, left: 0, right: 0,
          zIndex: 'var(--z-nav)' as string,
          height: '68px',
        }}
      >
        {/* ── Frosted glass background (animates in on scroll) ── */}
        <div
          style={{
            position: 'absolute', inset: 0,
            backgroundColor: scrolled ? 'rgba(255,255,255,0.9)' : 'transparent',
            backdropFilter:       scrolled ? 'blur(32px) saturate(200%)' : 'none',
            WebkitBackdropFilter: scrolled ? 'blur(32px) saturate(200%)' : 'none',
            borderBottom: `1px solid ${scrolled ? 'rgba(0,0,0,0.07)' : 'transparent'}`,
            boxShadow:    scrolled ? '0 2px 32px rgba(0,0,0,0.05)' : 'none',
            transition:   'background-color 0.35s ease, backdrop-filter 0.35s ease, border-color 0.35s ease, box-shadow 0.35s ease',
          }}
        />

        {/* ── Inner layout ── */}
        <div
          style={{
            position: 'relative',
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            maxWidth: '1280px',
            margin: '0 auto',
            padding: '0 clamp(1.5rem, 4vw, 3rem)',
          }}
        >
          {/* ── Logo ── */}
          <Link href="/" onClick={handleLinkClick}
            style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}
          >
            <motion.div
              whileHover={{ scale: 1.08 }}
              whileTap={{ scale: 0.93 }}
              transition={SP}
              style={{
                width: 38, height: 38,
                background: 'linear-gradient(135deg, #FF7F7F 0%, #FFCBA4 100%)',
                borderRadius: '12px',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.05rem', fontWeight: 900, color: '#fff',
                boxShadow: '0 4px 18px rgba(255,127,127,0.42)',
                fontFamily: 'var(--font-heading)',
                letterSpacing: '-0.04em',
                flexShrink: 0,
              }}
            >
              C
            </motion.div>
            <span
              style={{
                fontSize: '1.05rem', fontWeight: 800,
                letterSpacing: '-0.035em', color: 'var(--text-pri)',
                fontFamily: 'var(--font-heading)',
              }}
            >
              College
              <span style={{
                background: 'linear-gradient(135deg, #4F46E5, #7c3aed)',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                backgroundClip: 'text',
              }}>Corner</span>
            </span>
          </Link>

          {/* ── Desktop nav links ── */}
          <motion.nav
            className="cc-desktop-nav"
            variants={stagger}
            initial="hidden"
            animate="visible"
            aria-label="Main navigation"
            style={{ display: 'flex', gap: '2px', marginLeft: '2rem', flex: 1 }}
          >
            {NAV_LINKS.map(({ href, label }) => {
              const active = pathname === href || pathname.startsWith(href + '/');
              return (
                <motion.div key={href} variants={linkItem}>
                  <Link href={href} onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
                    <motion.span
                      whileHover={{ color: 'var(--indigo)' }}
                      transition={{ duration: 0.15 }}
                      style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '0.44rem 1rem',
                        borderRadius: 'var(--r-pill)',
                        fontSize: '0.875rem',
                        fontWeight: active ? 700 : 500,
                        color: active ? 'var(--indigo)' : 'var(--text-sec)',
                        cursor: 'pointer',
                        position: 'relative',
                        fontFamily: 'var(--font-body)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      {active && (
                        <motion.span
                          layoutId="nav-pill"
                          transition={SP}
                          style={{
                            position: 'absolute', inset: 0,
                            background: 'rgba(79,70,229,0.07)',
                            borderRadius: 'var(--r-pill)',
                            border: '1px solid rgba(79,70,229,0.15)',
                          }}
                        />
                      )}
                      <span style={{ position: 'relative', zIndex: 1 }}>{label}</span>
                    </motion.span>
                  </Link>
                </motion.div>
              );
            })}
          </motion.nav>

          {/* ── Auth CTAs + cart + hamburger ── */}
          <motion.div
            variants={stagger}
            initial="hidden"
            animate="visible"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', marginLeft: 'auto' }}
          >
            {user ? (
              /* ── Logged-in: cart + avatar dropdown ── */
              <>
                {/* Cart button */}
                <motion.div variants={linkItem} className="cc-desktop-nav">
                  <motion.button
                    onClick={toggleCart}
                    whileHover={{ backgroundColor: 'var(--surface-3)' }}
                    whileTap={{ scale: 0.93 }}
                    transition={{ duration: 0.18 }}
                    aria-label="Open cart"
                    style={{
                      position: 'relative',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 38, height: 38, borderRadius: 'var(--r-pill)',
                      border: 'none', background: 'transparent', cursor: 'pointer',
                      fontSize: '1.1rem',
                    }}
                  >
                    🛒
                    <AnimatePresence>
                      {totalItems > 0 && (
                        <motion.span
                          key="badge"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                          style={{
                            position: 'absolute', top: 2, right: 2,
                            width: 16, height: 16, borderRadius: '50%',
                            background: 'linear-gradient(135deg,#4f46e5,#7c3aed)',
                            color: '#fff', fontSize: '0.6rem', fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1,
                          }}
                        >
                          {totalItems > 9 ? '9+' : totalItems}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>

                {/* Bell / Notifications */}
                <motion.div variants={linkItem} className="cc-desktop-nav"
                  ref={bellRef}
                  style={{ position: 'relative' }}
                >
                  <motion.button
                    onClick={() => { setBellOpen(v => !v); setDropdownOpen(false); if (!bellOpen) refresh(); }}
                    whileHover={{ backgroundColor: 'var(--surface-3)' }}
                    whileTap={{ scale: 0.93 }}
                    transition={{ duration: 0.18 }}
                    aria-label="Notifications"
                    style={{
                      position: 'relative',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      width: 38, height: 38, borderRadius: 'var(--r-pill)',
                      border: bellOpen ? '1.5px solid var(--border)' : 'none',
                      background: bellOpen ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer', fontSize: '1.1rem',
                    }}
                  >
                    🔔
                    <AnimatePresence>
                      {unreadCount > 0 && (
                        <motion.span
                          key="bell-badge"
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          exit={{ scale: 0 }}
                          transition={{ type: 'spring', stiffness: 500, damping: 28 }}
                          style={{
                            position: 'absolute', top: 2, right: 2,
                            width: 16, height: 16, borderRadius: '50%',
                            background: '#ef4444',
                            color: '#fff', fontSize: '0.6rem', fontWeight: 900,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                          }}
                        >
                          {unreadCount > 9 ? '9+' : unreadCount}
                        </motion.span>
                      )}
                    </AnimatePresence>
                  </motion.button>

                  {/* Notification panel */}
                  <AnimatePresence>
                    {bellOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        style={{
                          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                          width: 340,
                          background: 'rgba(255,255,255,0.97)',
                          backdropFilter: 'blur(24px)',
                          WebkitBackdropFilter: 'blur(24px)',
                          borderRadius: 'var(--r-lg)',
                          border: '1px solid var(--border)',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                          overflow: 'hidden',
                          zIndex: 10,
                        }}
                      >
                        {/* Panel header */}
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.9rem 1.1rem 0.65rem', borderBottom: '1px solid var(--border)' }}>
                          <span style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>
                            Notifications {unreadCount > 0 && <span style={{ color: '#ef4444' }}>({unreadCount})</span>}
                          </span>
                          {unreadCount > 0 && (
                            <button
                              onClick={() => markAllRead()}
                              style={{ fontSize: '0.72rem', fontWeight: 600, color: 'var(--indigo)', background: 'none', border: 'none', cursor: 'pointer', padding: '2px 6px', borderRadius: 6, fontFamily: 'var(--font-body)' }}
                            >
                              Mark all read
                            </button>
                          )}
                        </div>

                        {/* Notification list */}
                        <div style={{ maxHeight: 380, overflowY: 'auto' }}>
                          {notifications.length === 0 ? (
                            <div style={{ padding: '2rem 1.5rem', textAlign: 'center' }}>
                              <div style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>🔔</div>
                              <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', fontFamily: 'var(--font-body)' }}>No notifications yet</p>
                            </div>
                          ) : (
                            notifications.map(n => {
                              const icon = n.type === 'order_status' ? '📦' : n.type === 'print_status' ? '🖨️' : '📢';
                              const ago  = (() => {
                                const diff = Date.now() - new Date(n.created_at).getTime();
                                if (diff < 60_000)  return 'just now';
                                if (diff < 3600_000) return `${Math.floor(diff / 60_000)}m ago`;
                                if (diff < 86400_000) return `${Math.floor(diff / 3600_000)}h ago`;
                                return `${Math.floor(diff / 86400_000)}d ago`;
                              })();
                              return (
                                <motion.div
                                  key={n.id}
                                  whileHover={{ backgroundColor: 'rgba(79,70,229,0.04)' }}
                                  transition={{ duration: 0.14 }}
                                  onClick={() => {
                                    if (!n.is_read) markOneRead(n.id);
                                    if (n.link) { setBellOpen(false); router.push(n.link); }
                                  }}
                                  style={{
                                    display: 'flex', gap: '0.75rem', alignItems: 'flex-start',
                                    padding: '0.8rem 1.1rem',
                                    borderBottom: '1px solid rgba(0,0,0,0.04)',
                                    cursor: n.link ? 'pointer' : 'default',
                                    background: n.is_read ? 'transparent' : 'rgba(79,70,229,0.03)',
                                  }}
                                >
                                  <span style={{ fontSize: '1.2rem', flexShrink: 0, marginTop: 1 }}>{icon}</span>
                                  <div style={{ flex: 1, minWidth: 0 }}>
                                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                                      <p style={{ fontSize: '0.82rem', fontWeight: n.is_read ? 600 : 800, color: 'var(--text-pri)', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'var(--font-body)' }}>
                                        {n.title}
                                      </p>
                                      {!n.is_read && (
                                        <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#4f46e5', flexShrink: 0 }} />
                                      )}
                                    </div>
                                    <p style={{ fontSize: '0.76rem', color: 'var(--text-sec)', margin: '0.15rem 0 0.25rem', fontFamily: 'var(--font-body)', lineHeight: 1.4 }}>
                                      {n.body}
                                    </p>
                                    <p style={{ fontSize: '0.7rem', color: 'var(--text-muted)', margin: 0, fontFamily: 'var(--font-body)' }}>
                                      {ago}
                                    </p>
                                  </div>
                                </motion.div>
                              );
                            })
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>

                {/* Avatar dropdown */}
                <motion.div variants={linkItem} className="cc-desktop-nav"
                  ref={dropdownRef}
                  style={{ position: 'relative' }}
                >
                  <motion.button
                    onClick={() => setDropdownOpen(v => !v)}
                    whileHover={{ boxShadow: '0 0 0 3px rgba(79,70,229,0.2)' }}
                    whileTap={{ scale: 0.93 }}
                    transition={{ duration: 0.15 }}
                    aria-label="Account menu"
                    aria-expanded={dropdownOpen}
                    style={{
                      display: 'flex', alignItems: 'center', gap: '7px',
                      padding: '0.28rem 0.7rem 0.28rem 0.28rem',
                      borderRadius: 'var(--r-pill)',
                      border: '1.5px solid var(--border)',
                      background: dropdownOpen ? 'var(--surface-2)' : 'transparent',
                      cursor: 'pointer', transition: 'background 0.18s',
                    }}
                  >
                    <div style={{
                      width: 30, height: 30, borderRadius: '50%',
                      background: 'var(--gradient-brand)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.8rem', fontWeight: 900, color: '#fff', flexShrink: 0,
                    }}>
                      {user.name[0].toUpperCase()}
                    </div>
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-pri)' }}>
                      {user.name.split(' ')[0]}
                    </span>
                    <motion.span
                      animate={{ rotate: dropdownOpen ? 180 : 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ fontSize: '0.6rem', color: 'var(--text-muted)', lineHeight: 1 }}
                    >
                      ▼
                    </motion.span>
                  </motion.button>

                  {/* Dropdown menu */}
                  <AnimatePresence>
                    {dropdownOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 8, scale: 0.96 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 6, scale: 0.97 }}
                        transition={{ duration: 0.18 }}
                        style={{
                          position: 'absolute', top: 'calc(100% + 8px)', right: 0,
                          minWidth: 200,
                          background: 'rgba(255,255,255,0.97)',
                          backdropFilter: 'blur(24px)',
                          WebkitBackdropFilter: 'blur(24px)',
                          borderRadius: 'var(--r-lg)',
                          border: '1px solid var(--border)',
                          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
                          overflow: 'hidden',
                          zIndex: 10,
                        }}
                      >
                        {/* User info header */}
                        <div style={{ padding: '0.9rem 1.1rem 0.7rem', borderBottom: '1px solid var(--border)' }}>
                          <p style={{ fontSize: '0.88rem', fontWeight: 800, color: 'var(--text-pri)' }}>{user.name}</p>
                          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '0.15rem' }}>{user.email}</p>
                        </div>

                        {/* Menu items */}
                        {[
                          { href: '/dashboard', label: '🏠  Dashboard' },
                          { href: '/profile',          label: '👤  Profile & Settings' },
                          { href: '/dashboard/orders', label: '📦  My Orders' },
                          ...(user.role === 'admin' ? [{ href: '/admin', label: '🛡️  Admin Panel' }] : []),
                        ].map(item => (
                          <Link key={item.href} href={item.href} onClick={handleLinkClick} style={{ textDecoration: 'none', display: 'block' }}>
                            <motion.div
                              whileHover={{ backgroundColor: 'rgba(79,70,229,0.05)', x: 2 }}
                              transition={{ duration: 0.14 }}
                              style={{ padding: '0.65rem 1.1rem', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-sec)', cursor: 'pointer' }}
                            >
                              {item.label}
                            </motion.div>
                          </Link>
                        ))}

                        <div style={{ height: 1, background: 'var(--border)', margin: '0.25rem 0' }} />

                        <motion.button
                          onClick={async () => { setDropdownOpen(false); await logout(); router.push('/'); }}
                          whileHover={{ backgroundColor: 'rgba(239,68,68,0.05)' }}
                          transition={{ duration: 0.14 }}
                          style={{
                            width: '100%', textAlign: 'left',
                            padding: '0.65rem 1.1rem', fontSize: '0.85rem', fontWeight: 600,
                            color: '#ef4444', cursor: 'pointer',
                            border: 'none', background: 'transparent',
                            fontFamily: 'var(--font-body)',
                          }}
                        >
                          🚪  Sign out
                        </motion.button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              </>
            ) : (
              /* ── Guest: log in + sign up ── */
              <>
                <motion.div variants={linkItem} className="cc-desktop-nav">
                  <Link href="/login" onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
                    <motion.span
                      whileHover={{ color: 'var(--text-pri)', backgroundColor: 'var(--surface-3)' }}
                      transition={{ duration: 0.18 }}
                      style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '0.48rem 1.1rem', borderRadius: 'var(--r-pill)',
                        fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-sec)',
                        cursor: 'pointer', fontFamily: 'var(--font-body)',
                      }}
                    >
                      Log in
                    </motion.span>
                  </Link>
                </motion.div>
                <motion.div variants={linkItem} className="cc-desktop-nav">
                  <Link href="/signup" onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
                    <motion.span
                      whileHover={{ scale: 1.04, boxShadow: '0 10px 36px rgba(255,127,127,0.48)' }}
                      whileTap={{ scale: 0.97 }}
                      transition={SP}
                      style={{
                        display: 'inline-flex', alignItems: 'center',
                        padding: '0.52rem 1.35rem', borderRadius: 'var(--r-pill)',
                        background: 'linear-gradient(135deg, #FF7F7F 0%, #FFCBA4 100%)',
                        color: '#fff', fontSize: '0.875rem', fontWeight: 700,
                        boxShadow: '0 4px 20px rgba(255,127,127,0.36)',
                        cursor: 'pointer', fontFamily: 'var(--font-heading)',
                        letterSpacing: '-0.01em',
                      }}
                    >
                      Sign up free
                    </motion.span>
                  </Link>
                </motion.div>
              </>
            )}

            {/* Hamburger — mobile only */}
            <motion.button
              variants={linkItem}
              className="cc-hamburger"
              onClick={() => setMenuOpen(v => !v)}
              aria-label={menuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={menuOpen}
              whileTap={{ scale: 0.9 }}
              style={{
                display: 'none',
                flexDirection: 'column', justifyContent: 'center', alignItems: 'center',
                width: 40, height: 40, gap: '5px',
                padding: '8px', marginLeft: '4px',
                borderRadius: 'var(--r-sm)',
                border: '1px solid var(--border)',
                background: 'transparent',
                cursor: 'pointer',
              }}
            >
              <motion.span animate={{ rotate: menuOpen ? 45 : 0, y: menuOpen ? 6 : 0 }}
                style={{ width: 18, height: 1.5, background: 'var(--text-pri)', borderRadius: 2, display: 'block', transformOrigin: 'center' }} />
              <motion.span animate={{ opacity: menuOpen ? 0 : 1 }}
                style={{ width: 18, height: 1.5, background: 'var(--text-pri)', borderRadius: 2, display: 'block' }} />
              <motion.span animate={{ rotate: menuOpen ? -45 : 0, y: menuOpen ? -6 : 0 }}
                style={{ width: 18, height: 1.5, background: 'var(--text-pri)', borderRadius: 2, display: 'block', transformOrigin: 'center' }} />
            </motion.button>
          </motion.div>
        </div>
      </motion.header>

      {/* ════════════════ MOBILE DRAWER ════════════════ */}
      <AnimatePresence>
        {menuOpen && (
          <motion.div
            key="cc-drawer"
            variants={drawerV}
            initial="hidden"
            animate="visible"
            exit="exit"
            style={{
              position: 'fixed',
              top: '76px', left: '1rem', right: '1rem',
              zIndex: 999,
              background: 'rgba(255,255,255,0.97)',
              backdropFilter: 'blur(32px) saturate(200%)',
              WebkitBackdropFilter: 'blur(32px) saturate(200%)',
              borderRadius: 'var(--r-xl)',
              border: '1px solid rgba(255,255,255,0.65)',
              boxShadow: '0 24px 64px rgba(0,0,0,0.12)',
              padding: '1.5rem',
              display: 'flex', flexDirection: 'column', gap: '0.4rem',
            }}
          >
            {NAV_LINKS.map(({ href, label }) => (
              <Link key={href} href={href} onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
                <motion.div
                  whileHover={{ x: 4 }}
                  whileTap={{ scale: 0.97 }}
                  transition={{ duration: 0.18 }}
                  style={{
                    padding: '0.88rem 1.2rem',
                    borderRadius: 'var(--r-md)',
                    fontSize: '1rem', fontWeight: 600,
                    color: pathname.startsWith(href) ? 'var(--indigo)' : 'var(--text-pri)',
                    background: pathname.startsWith(href) ? 'rgba(79,70,229,0.06)' : 'transparent',
                    fontFamily: 'var(--font-heading)',
                  }}
                >
                  {label}
                </motion.div>
              </Link>
            ))}

            <div style={{ height: 1, background: 'var(--border)', margin: '0.4rem 0' }} />

            {user ? (
              <>
                <Link href="/profile" onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
                  <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.18 }}
                    style={{ padding: '0.88rem 1.2rem', borderRadius: 'var(--r-md)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>
                    👤  Profile & Settings
                  </motion.div>
                </Link>
                <Link href="/dashboard/orders" onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
                  <motion.div whileHover={{ x: 4 }} whileTap={{ scale: 0.97 }} transition={{ duration: 0.18 }}
                    style={{ padding: '0.88rem 1.2rem', borderRadius: 'var(--r-md)', fontSize: '1rem', fontWeight: 600, color: 'var(--text-pri)', fontFamily: 'var(--font-heading)' }}>
                    📦  My Orders
                  </motion.div>
                </Link>
                <motion.div
                  onClick={async () => { handleLinkClick(); await logout(); router.push('/'); }}
                  whileTap={{ scale: 0.97 }}
                  style={{
                    padding: '0.88rem 1.2rem', borderRadius: 'var(--r-md)',
                    fontSize: '1rem', fontWeight: 600, color: '#ef4444',
                    fontFamily: 'var(--font-heading)', cursor: 'pointer',
                  }}
                >
                  🚪  Sign out
                </motion.div>
              </>
            ) : (
              <>
                <Link href="/login" onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
                  <motion.div whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '0.88rem 1.2rem', borderRadius: 'var(--r-md)',
                      fontSize: '1rem', fontWeight: 600, color: 'var(--text-sec)',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    Log in
                  </motion.div>
                </Link>
                <Link href="/signup" onClick={handleLinkClick} style={{ textDecoration: 'none' }}>
                  <motion.div whileTap={{ scale: 0.97 }}
                    style={{
                      padding: '0.88rem 1.2rem', borderRadius: 'var(--r-pill)',
                      background: 'linear-gradient(135deg, #FF7F7F 0%, #FFCBA4 100%)',
                      color: '#fff', textAlign: 'center',
                      fontSize: '1rem', fontWeight: 700,
                      boxShadow: '0 4px 20px rgba(255,127,127,0.34)',
                      fontFamily: 'var(--font-heading)',
                    }}
                  >
                    Sign up free →
                  </motion.div>
                </Link>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Responsive CSS ── */}
      <style>{`
        @media (max-width: 768px) {
          .cc-hamburger    { display: flex !important; }
          .cc-desktop-nav  { display: none !important; }
        }
      `}</style>
    </>
  );
}

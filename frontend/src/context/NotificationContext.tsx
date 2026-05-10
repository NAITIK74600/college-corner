'use client';

import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from 'react';
import { notificationsApi, AppNotification } from '@/lib/api';
import { useAuth } from './AuthContext';

// Backend origin (strips /api suffix if present)
const SSE_ORIGIN =
  (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace(/\/api$/, '');

interface NotificationContextValue {
  notifications:  AppNotification[];
  unreadCount:    number;
  loading:        boolean;
  refresh:        () => Promise<void>;
  markAllRead:    () => Promise<void>;
  markOneRead:    (id: string) => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue>({
  notifications:  [],
  unreadCount:    0,
  loading:        false,
  refresh:        async () => {},
  markAllRead:    async () => {},
  markOneRead:    async () => {},
});

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const res = await notificationsApi.list(30);
      if (res?.data) {
        setNotifications(res.data.notifications);
        setUnreadCount(res.data.unreadCount);
      }
    } catch {
      // silently fail — non-critical
    }
  }, [user]);

  const markAllRead = useCallback(async () => {
    try {
      await notificationsApi.readAll();
      setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
      setUnreadCount(0);
    } catch { /* ignore */ }
  }, []);

  const markOneRead = useCallback(async (id: string) => {
    try {
      await notificationsApi.readOne(id);
      setNotifications(prev =>
        prev.map(n => n.id === id ? { ...n, is_read: true } : n),
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch { /* ignore */ }
  }, []);

  // Keep a ref so SSE callbacks always call the latest refresh without
  // being listed in the effect dependency array (avoids re-opening on every
  // render when refresh identity changes).
  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!user) {
      setNotifications([]);
      setUnreadCount(0);
      return;
    }

    let es: EventSource | null = null;
    let fallbackTimer: ReturnType<typeof setInterval> | null = null;

    const stopFallback = () => {
      if (fallbackTimer) { clearInterval(fallbackTimer); fallbackTimer = null; }
    };

    const startFallback = () => {
      if (fallbackTimer) return;                          // already running
      fallbackTimer = setInterval(() => refreshRef.current(), 60_000);
    };

    // ── Initial full fetch ────────────────────────────────────────────────
    setLoading(true);
    refreshRef.current().finally(() => setLoading(false));

    // ── Open SSE connection ───────────────────────────────────────────────
    es = new EventSource(`${SSE_ORIGIN}/api/notifications/stream`, {
      withCredentials: true,   // send HttpOnly cookie cross-origin
    });

    es.onopen = () => {
      // SSE (re)connected — stop the fallback poll; resync full list
      stopFallback();
      refreshRef.current();
    };

    // Server sends this on (re)connect with current unread count
    es.addEventListener('connected', (evt) => {
      const data = JSON.parse((evt as MessageEvent).data);
      if (typeof data.unreadCount === 'number') {
        setUnreadCount(data.unreadCount);
      }
    });

    // New notification pushed in real-time
    es.addEventListener('notification', (evt) => {
      const notif: AppNotification = JSON.parse((evt as MessageEvent).data);
      setNotifications(prev => [notif, ...prev].slice(0, 30));
      setUnreadCount(prev => prev + 1);
    });

    es.onerror = () => {
      // EventSource will auto-reconnect; start polling as a fallback
      // in the meantime so users don't miss updates.
      startFallback();
    };

    return () => {
      es?.close();
      stopFallback();
    };
  }, [user]); // intentionally omits refreshRef — it's always current via ref

  return (
    <NotificationContext.Provider
      value={{ notifications, unreadCount, loading, refresh, markAllRead, markOneRead }}
    >
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  return useContext(NotificationContext);
}

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, CheckCheck, Trash2, AlertTriangle, Info, AlertCircle, Zap, RefreshCw } from "lucide-react";
import useAuthStore from "../../store/useAuthStore";
import { apiFetch } from "../../config/api";

const SEVERITY_CONFIG = {
  info:     { icon: Info,          color: "text-blue-400",   bg: "bg-blue-500/8",   border: "border-blue-500/20",   dot: "bg-blue-400"   },
  warning:  { icon: AlertTriangle, color: "text-yellow-400", bg: "bg-yellow-500/8", border: "border-yellow-500/20", dot: "bg-yellow-400" },
  alert:    { icon: AlertCircle,   color: "text-orange-400", bg: "bg-orange-500/8", border: "border-orange-500/20", dot: "bg-orange-400" },
  critical: { icon: Zap,           color: "text-red-400",    bg: "bg-red-500/8",    border: "border-red-500/20",    dot: "bg-red-500"    },
};

function timeAgo(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1)  return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

export default function NotificationPanel() {
  const { user, getToken } = useAuthStore();
  const [isOpen, setIsOpen]               = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount]     = useState(0);
  const [loading, setLoading]             = useState(false);
  const [error, setError]                 = useState(null);
  const panelRef = useRef(null);

  // ── Close on outside click ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // ── Fetch notifications ─────────────────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    setError(null);
    try {
      const data = await apiFetch("/api/notifications/user?limit=20");
      setNotifications(data.data || []);
      setUnreadCount((data.data || []).filter((n) => !n.read).length);
    } catch (err) {
      setError("Failed to load notifications.");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Fetch on open + poll every 30s when logged in
  useEffect(() => {
    if (!user) { setNotifications([]); setUnreadCount(0); return; }
    fetchNotifications();
    const id = setInterval(fetchNotifications, 30_000);
    return () => clearInterval(id);
  }, [user, fetchNotifications]);

  // ── Actions ─────────────────────────────────────────────────────────────────
  const markAllRead = async () => {
    try {
      await apiFetch("/api/notifications/read-all", { method: "PUT" });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch { /* silent */ }
  };

  const markOneRead = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}/read`, { method: "PUT" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  const deleteOne = async (id) => {
    try {
      await apiFetch(`/api/notifications/${id}`, { method: "DELETE" });
      const removed = notifications.find((n) => n.id === id);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      if (removed && !removed.read) setUnreadCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="relative" ref={panelRef}>
      {/* ── Bell Button ── */}
      <button
        onClick={() => { setIsOpen((o) => !o); if (!isOpen) fetchNotifications(); }}
        className="relative w-9 h-9 grid place-items-center rounded-xl text-slate-400
                   hover:text-white hover:bg-white/8 transition-colors cursor-pointer"
        aria-label="Notifications"
      >
        <Bell size={16} className={unreadCount > 0 ? "text-cyan-400" : ""} />
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0 }}
              className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full
                         bg-red-500 border border-[#020611] flex items-center justify-center
                         text-[9px] font-bold text-white leading-none"
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </button>

      {/* ── Dropdown Panel ── */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ duration: 0.18 }}
            className="absolute right-0 mt-2 w-80 rounded-2xl border border-white/10
                       bg-slate-950/92 shadow-2xl backdrop-blur-2xl z-[60] overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/6">
              <div className="flex items-center gap-2">
                <Bell size={14} className="text-cyan-400" />
                <span className="text-xs font-bold uppercase tracking-wider text-white">
                  Notifications
                </span>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full bg-red-500/15 text-red-400 text-[10px] font-bold border border-red-500/20">
                    {unreadCount} new
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {unreadCount > 0 && (
                  <button
                    onClick={markAllRead}
                    title="Mark all as read"
                    className="w-7 h-7 grid place-items-center rounded-lg text-slate-400
                               hover:bg-white/8 hover:text-cyan-400 transition-colors cursor-pointer"
                  >
                    <CheckCheck size={13} />
                  </button>
                )}
                <button
                  onClick={fetchNotifications}
                  title="Refresh"
                  className="w-7 h-7 grid place-items-center rounded-lg text-slate-400
                             hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
                >
                  <RefreshCw size={12} className={loading ? "animate-spin" : ""} />
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="w-7 h-7 grid place-items-center rounded-lg text-slate-400
                             hover:bg-white/8 hover:text-white transition-colors cursor-pointer"
                >
                  <X size={13} />
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="max-h-[380px] overflow-y-auto overscroll-contain scrollbar-thin
                            scrollbar-thumb-white/10 scrollbar-track-transparent">
              {!user ? (
                <div className="py-10 text-center text-xs text-slate-500 px-4">
                  <Bell size={24} className="mx-auto mb-2 opacity-20" />
                  Sign in to view your notifications.
                </div>
              ) : loading && notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500">
                  <RefreshCw size={20} className="mx-auto mb-2 animate-spin opacity-30" />
                  Loading…
                </div>
              ) : error ? (
                <div className="py-8 text-center text-xs text-red-400 px-4">
                  <AlertCircle size={20} className="mx-auto mb-2 opacity-50" />
                  {error}
                </div>
              ) : notifications.length === 0 ? (
                <div className="py-10 text-center text-xs text-slate-500 px-4">
                  <CheckCheck size={24} className="mx-auto mb-2 opacity-20" />
                  You're all caught up!
                </div>
              ) : (
                <div className="divide-y divide-white/4">
                  {notifications.map((n) => {
                    const cfg = SEVERITY_CONFIG[n.severity] || SEVERITY_CONFIG.info;
                    const Icon = cfg.icon;
                    return (
                      <motion.div
                        key={n.id}
                        layout
                        initial={{ opacity: 0, x: 12 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -12 }}
                        onClick={() => !n.read && markOneRead(n.id)}
                        className={`group relative flex gap-3 px-4 py-3 cursor-pointer
                                    transition-colors hover:bg-white/3
                                    ${!n.read ? "bg-white/2" : "opacity-70"}`}
                      >
                        {/* Unread indicator */}
                        {!n.read && (
                          <span className={`absolute left-1.5 top-1/2 -translate-y-1/2
                                           w-1 h-1 rounded-full ${cfg.dot}`} />
                        )}

                        {/* Icon */}
                        <div className={`shrink-0 w-7 h-7 rounded-lg grid place-items-center
                                         ${cfg.bg} border ${cfg.border} mt-0.5`}>
                          <Icon size={13} className={cfg.color} />
                        </div>

                        {/* Content */}
                        <div className="flex-1 min-w-0 pr-6">
                          <div className="text-xs font-semibold text-slate-200 truncate leading-tight">
                            {n.title}
                          </div>
                          <div className="text-[11px] text-slate-400 mt-0.5 leading-relaxed line-clamp-2">
                            {n.message}
                          </div>
                          <div className="text-[10px] text-slate-600 mt-1 font-mono">
                            {timeAgo(n.createdAt)}
                          </div>
                        </div>

                        {/* Delete button */}
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteOne(n.id); }}
                          className="absolute right-3 top-3 w-6 h-6 grid place-items-center rounded-lg
                                     text-slate-600 hover:text-red-400 hover:bg-red-500/8
                                     opacity-0 group-hover:opacity-100 transition-all cursor-pointer"
                        >
                          <Trash2 size={11} />
                        </button>
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-2.5 border-t border-white/6 text-center">
                <span className="text-[10px] text-slate-600">
                  {notifications.length} notification{notifications.length !== 1 ? "s" : ""} loaded
                </span>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";

interface Notification {
  id: string;
  type: string;
  title: string;
  message: string;
  fight_id: string | null;
  read: number;
  created_at: string;
}

export default function NotificationBell({ wallet }: { wallet: string | null }) {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [open, setOpen] = useState(false);
  const [toast, setToast] = useState<Notification | null>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const prevCountRef = useRef(0);

  // SSE connection for real-time notifications
  useEffect(() => {
    if (!wallet) return;

    const es = new EventSource(`/api/notifications/live?wallet=${wallet}`);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "notifications") {
          setUnreadCount(data.unreadCount);
          setNotifications(data.latest);

          // Show toast for new notifications
          if (data.unreadCount > prevCountRef.current && data.latest.length > 0) {
            setToast(data.latest[0]);
            setTimeout(() => setToast(null), 5000);
          }
          prevCountRef.current = data.unreadCount;
        }
      } catch { /* ignore */ }
    };

    return () => es.close();
  }, [wallet]);

  // Close panel on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const markAllRead = async () => {
    if (!wallet) return;
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wallet }),
    });
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: 1 })));
  };

  if (!wallet) return null;

  const iconForType = (type: string) => {
    switch (type) {
      case "bet_won": return "🎉";
      case "bet_lost": return "💀";
      case "bet_refunded": return "↩️";
      default: return "🔔";
    }
  };

  const timeAgo = (dateStr: string) => {
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hours = Math.floor(mins / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  return (
    <>
      {/* Bell button */}
      <div className="relative" ref={panelRef}>
        <button
          onClick={() => setOpen(!open)}
          className="relative p-2 text-gray-400 hover:text-white transition"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 mt-2 w-80 bg-[#161b22] border border-[#1c2333] rounded-xl shadow-2xl z-50 overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-[#1c2333]">
              <h3 className="font-semibold text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button onClick={markAllRead} className="text-xs text-[#4ade80] hover:underline">
                  Mark all read
                </button>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-600 text-sm">No notifications yet</div>
              ) : (
                notifications.map((n) => (
                  <div
                    key={n.id}
                    className={`px-4 py-3 border-b border-[#1c2333] hover:bg-[#1c2333]/30 transition ${
                      !n.read ? "bg-[#4ade80]/5" : ""
                    }`}
                  >
                    {n.fight_id ? (
                      <Link href={`/fight/${n.fight_id}`} onClick={() => setOpen(false)} className="block">
                        <div className="flex items-start gap-2">
                          <span className="text-lg mt-0.5">{iconForType(n.type)}</span>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold">{n.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{n.message}</p>
                            <p className="text-[10px] text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                          </div>
                          {!n.read && <div className="w-2 h-2 bg-[#4ade80] rounded-full mt-1.5 shrink-0" />}
                        </div>
                      </Link>
                    ) : (
                      <div className="flex items-start gap-2">
                        <span className="text-lg mt-0.5">{iconForType(n.type)}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold">{n.title}</p>
                          <p className="text-xs text-gray-400 mt-0.5">{n.message}</p>
                          <p className="text-[10px] text-gray-600 mt-1">{timeAgo(n.created_at)}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5">
          <div className="bg-[#161b22] border border-[#1c2333] rounded-xl shadow-2xl p-4 max-w-sm flex items-start gap-3">
            <span className="text-2xl">{iconForType(toast.type)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold text-white">{toast.title}</p>
              <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{toast.message}</p>
            </div>
            <button onClick={() => setToast(null)} className="text-gray-500 hover:text-white text-lg">×</button>
          </div>
        </div>
      )}
    </>
  );
}

"use client";

import { useEffect, useRef, useState, useCallback } from "react";

interface ChatMessage {
  id: string;
  seq: number;
  wallet: string;
  username: string | null;
  message: string;
  created_at: string;
}

function shortWallet(w: string) {
  return w.length > 10 ? `${w.slice(0, 6)}...${w.slice(-4)}` : w;
}

export default function FightChat({ fightId, wallet }: { fightId: string; wallet?: string }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sending, setSending] = useState(false);
  const lastIdRef = useRef(0);
  const listRef = useRef<HTMLDivElement>(null);
  const effectiveWallet = wallet || "0xDEMO";

  const poll = useCallback(async () => {
    try {
      const url = lastIdRef.current
        ? `/api/fights/${fightId}/chat?afterId=${lastIdRef.current}`
        : `/api/fights/${fightId}/chat`;
      const res = await fetch(url);
      if (!res.ok) return;
      const rows: ChatMessage[] = await res.json();
      if (rows.length === 0) return;
      setMessages(prev => lastIdRef.current ? [...prev, ...rows] : rows);
      lastIdRef.current = rows[rows.length - 1].seq;
    } catch {}
  }, [fightId]);

  useEffect(() => {
    poll();
    const t = setInterval(poll, 2500);
    return () => clearInterval(t);
  }, [poll]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch(`/api/fights/${fightId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: effectiveWallet, message: text }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to send");
      } else {
        setDraft("");
        await poll();
      }
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] flex flex-col h-[420px]">
      <div className="px-4 py-3 border-b border-[#1c2333] flex items-center gap-2">
        <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
        <h3 className="font-bold text-sm">Live Chat</h3>
      </div>
      <div ref={listRef} className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {messages.length === 0 ? (
          <p className="text-xs text-gray-600 text-center pt-6">No messages yet — say something.</p>
        ) : (
          messages.map(m => (
            <div key={m.id} className="text-xs">
              <span className="text-gray-500 font-mono">{m.username || shortWallet(m.wallet)}</span>
              <span className="text-gray-700">: </span>
              <span className="text-gray-300 break-words">{m.message}</span>
            </div>
          ))
        )}
      </div>
      <div className="p-3 border-t border-[#1c2333]">
        {error && <p className="text-[10px] text-red-400 mb-1">{error}</p>}
        <div className="flex gap-2">
          <input
            value={draft}
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") send(); }}
            maxLength={300}
            placeholder="Send a message..."
            className="flex-1 px-3 py-2 bg-[#0d1117] border border-[#1c2333] rounded-lg text-xs focus:outline-none focus:border-[#4ade80]/50"
          />
          <button
            onClick={send}
            disabled={sending || !draft.trim()}
            className="px-3 py-2 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold rounded-lg text-xs transition disabled:opacity-50"
          >
            Send
          </button>
        </div>
      </div>
    </div>
  );
}

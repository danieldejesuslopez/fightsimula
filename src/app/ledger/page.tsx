"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface LedgerEntry {
  id: string;
  block_number: number;
  tx_hash: string;
  event_type: string;
  wallet: string | null;
  fight_id: string | null;
  bet_id: string | null;
  amount: number | null;
  confirmations: number;
  created_at: string;
}

const EVENT_LABELS: Record<string, { label: string; color: string }> = {
  bet_escrow: { label: "Bet Escrow", color: "text-yellow-400" },
  market_escrow: { label: "Market Escrow", color: "text-yellow-400" },
  escrow_deposit: { label: "Deposit", color: "text-blue-400" },
  settlement_payout: { label: "Payout", color: "text-green-400" },
  settlement_refund: { label: "Refund", color: "text-gray-400" },
};

function shortHash(h: string) {
  return `${h.slice(0, 10)}...${h.slice(-6)}`;
}

export default function LedgerPage() {
  const [entries, setEntries] = useState<LedgerEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/ledger")
      .then(r => r.json())
      .then(setEntries)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Settlement Ledger</span>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 py-6">
        <div className="mb-6 p-4 rounded-2xl border border-yellow-500/20 bg-yellow-500/5">
          <p className="text-sm font-semibold text-yellow-400 mb-1">⚠️ Simulated ledger — not a real blockchain</p>
          <p className="text-xs text-gray-400">
            Every row below models what an audited on-chain escrow/settlement contract would record — a tx hash, a block
            number, confirmations — so the shape matches a real integration. None of it is backed by a deployed contract,
            real custody, or real capital. See <code className="text-gray-300">contracts/</code> for the Solidity source that
            a real deployment would use, and <code className="text-gray-300">src/lib/contract.ts</code> for the client
            that talks to it once <code className="text-gray-300">NEXT_PUBLIC_CONTRACT_ADDRESS</code> is set.
          </p>
        </div>

        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] overflow-hidden">
          <div className="px-5 py-3 border-b border-[#1c2333] flex items-center justify-between">
            <h2 className="font-bold text-sm">Recent Settlement Events</h2>
            <span className="text-xs text-gray-600">{entries.length} events</span>
          </div>
          {loading ? (
            <div className="p-8 text-center text-gray-600 text-sm">Loading...</div>
          ) : entries.length === 0 ? (
            <div className="p-8 text-center text-gray-600 text-sm">No ledger events yet — place a bet or settle a fight.</div>
          ) : (
            <div className="divide-y divide-[#1c2333]">
              {entries.map(e => {
                const meta = EVENT_LABELS[e.event_type] ?? { label: e.event_type, color: "text-gray-400" };
                return (
                  <div key={e.id} className="px-5 py-3 flex items-center justify-between text-xs font-mono">
                    <div className="flex items-center gap-3">
                      <span className="text-gray-700 w-20">#{e.block_number}</span>
                      <span className={`font-semibold w-32 ${meta.color}`}>{meta.label}</span>
                      <span className="text-gray-500">{shortHash(e.tx_hash)}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      {e.wallet && <span className="text-gray-500">{shortHash(e.wallet)}</span>}
                      {e.amount != null && <span className="text-white font-semibold">${e.amount.toFixed(2)}</span>}
                      <span className="text-green-500/70">{e.confirmations}✓</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}

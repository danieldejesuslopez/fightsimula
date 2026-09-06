"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Alert = { id: string; wallet: string | null; fightId: string | null; severity: "low" | "medium" | "high"; type: string; message: string; status: string };

const colors = { low: "text-yellow-300 bg-yellow-500/10 border-yellow-500/25", medium: "text-orange-300 bg-orange-500/10 border-orange-500/25", high: "text-red-300 bg-red-500/10 border-red-500/25" };

export default function IntegrityPage() {
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [summary, setSummary] = useState({ open: 0, high: 0, reviewed: 0 });
  const [loading, setLoading] = useState(true);
  const load = async () => {
    const result = await fetch("/api/integrity").then((response) => response.json());
    setAlerts(result.alerts ?? []); setSummary(result.summary ?? { open: 0, high: 0, reviewed: 0 }); setLoading(false);
  };
  useEffect(() => { const initial = window.setTimeout(load, 0); const interval = window.setInterval(load, 15000); return () => { window.clearTimeout(initial); window.clearInterval(interval); }; }, []);
  const review = async (alert: Alert) => { await fetch("/api/integrity", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review", alert }) }); load(); };
  return <div className="min-h-screen bg-[#0d1117] text-white">
    <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-40"><div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-3"><Link href="/" className="font-bold text-lg">🥊 All<span className="text-[#4ade80]">Fights</span></Link><span className="text-gray-700">›</span><span className="text-sm text-gray-400">Market Integrity</span></div></header>
    <main className="max-w-6xl mx-auto p-4 md:p-8"><div className="flex flex-wrap items-end justify-between gap-3 mb-7"><div><p className="text-xs tracking-[.25em] text-[#4ade80] font-bold">MARKET INTEGRITY</p><h1 className="text-3xl font-black mt-1">Anti-Manipulation Console</h1><p className="text-sm text-gray-500 mt-2">Automated monitoring flags unusual patterns for human review. Flags do not determine an account outcome.</p></div><button onClick={load} className="px-4 py-2 rounded-lg border border-[#1c2333] text-sm text-gray-300 hover:border-[#4ade80]">Refresh scan</button></div>
      <section className="grid sm:grid-cols-3 gap-4 mb-7">{[["Open alerts", summary.open, "text-white"], ["High priority", summary.high, "text-red-400"], ["Reviewed", summary.reviewed, "text-[#4ade80]"]].map(([label, value, color]) => <div key={String(label)} className="rounded-xl border border-[#1c2333] bg-[#161b22] p-5"><p className="text-xs text-gray-500">{label}</p><p className={`text-3xl font-black mt-1 ${color}`}>{value}</p></div>)}</section>
      <section className="rounded-xl border border-[#1c2333] overflow-hidden bg-[#161b22]"><div className="p-4 border-b border-[#1c2333] flex justify-between"><h2 className="font-bold">Detection queue</h2><span className="text-xs text-gray-500">Live refresh every 15 seconds</span></div>{loading ? <p className="p-8 text-gray-500">Scanning market activity…</p> : alerts.length === 0 ? <div className="p-12 text-center text-gray-500">✓ No suspicious activity detected.</div> : <div className="divide-y divide-[#1c2333]">{alerts.map((alert) => <div key={alert.id} className="p-4 flex flex-col md:flex-row gap-3 md:items-center"><span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-1 border rounded ${colors[alert.severity]}`}>{alert.severity}</span><div className="flex-1"><p className="text-sm font-medium">{alert.message}</p><p className="text-xs text-gray-600 mt-1">{alert.type.replaceAll("_", " ")} {alert.wallet ? `· ${alert.wallet.slice(0, 8)}…` : ""}</p></div>{alert.fightId && <Link href={`/fight/${alert.fightId}`} className="text-xs text-[#4ade80]">View fight →</Link>}{alert.status === "open" && !alert.id.startsWith("rapid-") && !alert.id.startsWith("whale-") && !alert.id.startsWith("imbalance-") ? <button onClick={() => review(alert)} className="text-xs px-3 py-1.5 border border-[#1c2333] rounded hover:border-[#4ade80]">Mark reviewed</button> : null}</div>)}</div>}</section>
      <p className="text-xs text-gray-600 mt-6">Signals monitored: rapid wagering, large single bets, disproportionate market concentration, and manually submitted integrity reports.</p>
    </main></div>;
}

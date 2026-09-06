"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface ReferralData {
  code: string;
  stats: { total_referrals: number; total_earned: number; pending: number };
  tier: { name: string; rate: number; min: number };
  referees: { wallet: string; joined: string; volume: number; your_earnings: number }[];
}

const DEMO_WALLET = "0xABC123";
const TIERS = [
  { name: "Bronze", min: 0, max: 5, rate: 5, color: "text-orange-400", bg: "bg-orange-400/10", border: "border-orange-400/20" },
  { name: "Silver", min: 5, max: 20, rate: 7.5, color: "text-gray-300", bg: "bg-gray-300/10", border: "border-gray-300/20" },
  { name: "Gold", min: 20, max: null, rate: 10, color: "text-yellow-400", bg: "bg-yellow-400/10", border: "border-yellow-400/20" },
];

function truncate(wallet: string) {
  if (wallet.length <= 10) return wallet;
  return wallet.slice(0, 6) + "..." + wallet.slice(-4);
}

export default function ReferralsPage() {
  const [data, setData] = useState<ReferralData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    fetch(`/api/referrals?wallet=${DEMO_WALLET}`)
      .then((r) => r.json())
      .then((d) => { setData(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const copyLink = () => {
    if (!data) return;
    navigator.clipboard.writeText(`allfights.xyz/ref/${data.code}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] text-white flex items-center justify-center">
        <p className="text-gray-600">Loading...</p>
      </div>
    );
  }

  const stats = data?.stats || { total_referrals: 0, total_earned: 0, pending: 0 };
  const currentTier = TIERS.find((t) => t.name === data?.tier.name) || TIERS[0];

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Referrals</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">Referral Program</h1>
        <p className="text-gray-500 text-sm mb-8">Invite friends and earn a percentage of their betting volume</p>

        {/* Referral Code + Link */}
        <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-6 mb-6">
          <p className="text-xs text-gray-500 mb-2">Your Referral Code</p>
          <div className="flex items-center gap-3 mb-4">
            <span className="text-2xl font-black text-[#4ade80] tracking-wider">{data?.code || "---"}</span>
            <span className={`text-xs px-2 py-0.5 rounded-full ${currentTier.bg} ${currentTier.color} ${currentTier.border} border`}>
              {currentTier.name} - {currentTier.rate}%
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm text-gray-400 truncate">
              allfights.xyz/ref/{data?.code || "---"}
            </div>
            <button
              onClick={copyLink}
              className="px-4 py-2 text-xs font-bold bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20 rounded-lg hover:bg-[#4ade80]/20 transition whitespace-nowrap"
            >
              {copied ? "Copied!" : "Copy Link"}
            </button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: "Total Referrals", value: stats.total_referrals },
            { label: "Total Earned", value: `$${(stats.total_earned || 0).toFixed(2)}` },
            { label: "Pending Rewards", value: `$${(stats.pending || 0).toFixed(2)}` },
          ].map((s) => (
            <div key={s.label} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 text-center">
              <p className="text-2xl font-black text-[#4ade80]">{s.value}</p>
              <p className="text-[10px] text-gray-600 mt-1">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tier System */}
        <h2 className="text-xl font-black mb-4">Tier System</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {TIERS.map((tier) => (
            <div
              key={tier.name}
              className={`rounded-xl border p-5 ${
                currentTier.name === tier.name
                  ? `${tier.bg} ${tier.border}`
                  : "bg-[#161b22] border-[#1c2333]"
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={`font-black ${tier.color}`}>{tier.name}</span>
                {currentTier.name === tier.name && (
                  <span className="text-[10px] bg-[#4ade80]/10 text-[#4ade80] px-2 py-0.5 rounded-full">Current</span>
                )}
              </div>
              <p className="text-2xl font-black">{tier.rate}%</p>
              <p className="text-xs text-gray-500 mt-1">
                {tier.max ? `${tier.min}-${tier.max} referrals` : `${tier.min}+ referrals`}
              </p>
            </div>
          ))}
        </div>

        {/* How it works */}
        <h2 className="text-xl font-black mb-4">How It Works</h2>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10">
          {[
            { step: "1", title: "Share Your Link", desc: "Send your referral link to friends" },
            { step: "2", title: "They Sign Up", desc: "Friends join AllFights using your code" },
            { step: "3", title: "Earn Rewards", desc: "Get a % of their betting volume as rewards" },
          ].map((s) => (
            <div key={s.step} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-5">
              <div className="w-8 h-8 rounded-full bg-[#4ade80]/10 text-[#4ade80] flex items-center justify-center text-sm font-black mb-3">{s.step}</div>
              <h3 className="font-bold text-sm mb-1">{s.title}</h3>
              <p className="text-xs text-gray-500">{s.desc}</p>
            </div>
          ))}
        </div>

        {/* Referred Users */}
        <h2 className="text-xl font-black mb-4">Referred Users</h2>
        {(data?.referees || []).length === 0 ? (
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-10 text-center">
            <p className="text-gray-500 text-sm">No referrals yet. Share your link to get started!</p>
          </div>
        ) : (
          <div className="space-y-2">
            {(data?.referees || []).map((r, i) => (
              <div key={i} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 flex items-center gap-4">
                <div className="w-10 h-10 rounded-full bg-[#0d1117] border border-[#1c2333] flex items-center justify-center text-sm text-gray-600 font-bold shrink-0">
                  #{i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm">{truncate(r.wallet)}</p>
                  <p className="text-[10px] text-gray-600 mt-0.5">Joined {new Date(r.joined).toLocaleDateString()}</p>
                </div>
                <div className="text-center w-20 hidden sm:block">
                  <p className="text-[10px] text-gray-600">Volume</p>
                  <p className="text-xs font-bold">${(r.volume || 0).toFixed(2)}</p>
                </div>
                <div className="text-right w-20">
                  <p className="text-[10px] text-gray-600">Your Earnings</p>
                  <p className="text-xs font-bold text-[#4ade80]">${(r.your_earnings || 0).toFixed(2)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

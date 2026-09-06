"use client";

import { useState } from "react";
import Link from "next/link";

export default function VerifyPage() {
  const [serverSeed, setServerSeed] = useState("");
  const [seedHash, setSeedHash] = useState("");
  const [result, setResult] = useState<{ valid: boolean; computed: string; expected: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [fights, setFights] = useState<{ id: string; fighterA: string; fighterB: string; seedHash: string; serverSeed?: string; method?: string; winner?: string; status: string }[]>([]);
  const [loadingFights, setLoadingFights] = useState(false);

  const verify = async () => {
    if (!serverSeed || !seedHash) return;
    setLoading(true);
    const res = await fetch("/api/verify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ serverSeed, seedHash }),
    });
    const data = await res.json();
    setResult(data);
    setLoading(false);
  };

  const loadFights = async () => {
    setLoadingFights(true);
    const res = await fetch("/api/fights");
    const data = await res.json();
    setFights(data.filter((f: Record<string, unknown>) => f.status === "finished").map((f: Record<string, unknown>) => ({
      id: f.id as string,
      fighterA: (f.fighterA as Record<string, unknown>).name as string,
      fighterB: (f.fighterB as Record<string, unknown>).name as string,
      seedHash: f.seedHash as string,
      serverSeed: f.serverSeed as string | undefined,
      method: f.method as string | undefined,
      winner: f.winnerId === (f.fighterA as Record<string, unknown>).id
        ? (f.fighterA as Record<string, unknown>).name as string
        : (f.fighterB as Record<string, unknown>).name as string,
      status: f.status as string,
    })));
    setLoadingFights(false);
  };

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Provably Fair Verification</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Hero */}
        <div className="text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 border border-green-500/20 mb-4">
            <svg className="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <h1 className="text-3xl font-black mb-2">Provably Fair</h1>
          <p className="text-gray-500 max-w-lg mx-auto text-sm">
            Every fight on AllFights is determined by a cryptographic seed that&apos;s hashed and published before the fight begins.
            After the fight, the server seed is revealed so you can verify the result was predetermined and not manipulated.
          </p>
        </div>

        {/* How it works */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
          <h2 className="font-bold mb-4">How It Works</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { step: "1", title: "Before Fight", desc: "A server seed is generated and its SHA-256 hash is published. You can see this hash before placing any bet." },
              { step: "2", title: "During Fight", desc: "The fight simulation uses the server seed + client seed + nonce as input to a deterministic PRNG. Every action is derived from these seeds." },
              { step: "3", title: "After Fight", desc: "The raw server seed is revealed. You verify that SHA-256(server_seed) matches the pre-published hash, proving the outcome wasn't altered." },
            ].map(s => (
              <div key={s.step} className="bg-[#0d1117] rounded-xl p-4 border border-[#1c2333]">
                <div className="w-8 h-8 rounded-full bg-[#4ade80]/10 flex items-center justify-center text-sm font-bold text-[#4ade80] mb-3">{s.step}</div>
                <h3 className="font-semibold text-sm mb-1">{s.title}</h3>
                <p className="text-xs text-gray-500">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Manual verification */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
          <h2 className="font-bold mb-4">Verify a Fight</h2>
          <div className="space-y-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Server Seed (revealed after fight)</label>
              <input
                type="text"
                value={serverSeed}
                onChange={(e) => setServerSeed(e.target.value)}
                placeholder="Enter server seed..."
                className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm font-mono focus:outline-none focus:border-[#4ade80]/50 transition"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1.5">Seed Hash (published before fight)</label>
              <input
                type="text"
                value={seedHash}
                onChange={(e) => setSeedHash(e.target.value)}
                placeholder="Enter seed hash..."
                className="w-full px-3 py-2.5 bg-[#0d1117] border border-[#1c2333] rounded-lg text-sm font-mono focus:outline-none focus:border-[#4ade80]/50 transition"
              />
            </div>
            <button
              onClick={verify}
              disabled={loading || !serverSeed || !seedHash}
              className="w-full py-3 bg-[#4ade80] hover:bg-[#22c55e] text-black font-bold rounded-xl text-sm transition disabled:opacity-50"
            >
              {loading ? "Verifying..." : "Verify Fight"}
            </button>
          </div>

          {result && (
            <div className={`mt-4 p-4 rounded-xl border ${result.valid ? "bg-green-500/5 border-green-500/20" : "bg-red-500/5 border-red-500/20"}`}>
              <div className="flex items-center gap-2 mb-3">
                {result.valid ? (
                  <>
                    <span className="text-2xl">✅</span>
                    <span className="font-bold text-green-400">Valid — Seeds Match!</span>
                  </>
                ) : (
                  <>
                    <span className="text-2xl">❌</span>
                    <span className="font-bold text-red-400">Invalid — Seeds Do Not Match</span>
                  </>
                )}
              </div>
              <div className="space-y-2 text-xs font-mono">
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <p className="text-gray-500 mb-1">Computed Hash: SHA256(server_seed)</p>
                  <p className="text-gray-300 break-all">{result.computed}</p>
                </div>
                <div className="bg-[#0d1117] rounded-lg p-3">
                  <p className="text-gray-500 mb-1">Expected Hash (pre-published)</p>
                  <p className="text-gray-300 break-all">{result.expected}</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Recent settled fights */}
        <div className="bg-[#161b22] rounded-2xl border border-[#1c2333] p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold">Recent Settled Fights</h2>
            {fights.length === 0 && (
              <button onClick={loadFights} disabled={loadingFights} className="text-xs text-[#4ade80] hover:text-[#22c55e] transition">
                {loadingFights ? "Loading..." : "Load fights"}
              </button>
            )}
          </div>

          {fights.length > 0 ? (
            <div className="space-y-3">
              {fights.map(f => (
                <div key={f.id} className="bg-[#0d1117] rounded-xl p-4 border border-[#1c2333]">
                  <div className="flex items-center justify-between mb-2">
                    <Link href={`/fight/${f.id}`} className="font-semibold text-sm hover:text-[#4ade80] transition">
                      {f.fighterA} vs {f.fighterB}
                    </Link>
                    <span className="text-xs text-green-400 font-semibold">🏆 {f.winner} — {f.method}</span>
                  </div>
                  <div className="space-y-1.5 text-xs font-mono">
                    <div className="flex items-start gap-2">
                      <span className="text-gray-600 shrink-0">HASH:</span>
                      <span className="text-gray-400 break-all">{f.seedHash}</span>
                    </div>
                    {f.serverSeed && (
                      <div className="flex items-start gap-2">
                        <span className="text-gray-600 shrink-0">SEED:</span>
                        <span className="text-gray-400 break-all">{f.serverSeed}</span>
                      </div>
                    )}
                  </div>
                  {f.serverSeed && (
                    <button
                      onClick={() => {
                        setServerSeed(f.serverSeed!);
                        setSeedHash(f.seedHash);
                        window.scrollTo({ top: 0, behavior: "smooth" });
                      }}
                      className="mt-2 text-[10px] text-[#4ade80] hover:text-[#22c55e] font-semibold transition"
                    >
                      ▶ Verify this fight
                    </button>
                  )}
                </div>
              ))}
            </div>
          ) : !loadingFights ? (
            <p className="text-xs text-gray-600">Click &quot;Load fights&quot; to see settled fights you can verify</p>
          ) : (
            <p className="text-xs text-gray-600">Loading...</p>
          )}
        </div>
      </main>
    </div>
  );
}

"use client";

import { useState, useEffect, useRef } from "react";
import { connectWallet, getWalletState, onAccountsChanged, type WalletState } from "@/lib/wallet";
import { BrowserProvider } from "ethers";
import Link from "next/link";

interface UserProfile {
  wallet: string;
  username: string;
  totalBets: number;
  wins: number;
  profit?: number;
}

export default function WalletButton({ onConnect }: { onConnect?: (address: string) => void }) {
  const [wallet, setWallet] = useState<WalletState | null>(null);
  const [user, setUser] = useState<UserProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getWalletState().then(setWallet);
    const cleanup = onAccountsChanged((accounts) => {
      if (accounts.length === 0) { setWallet(null); setUser(null); }
      else getWalletState().then(setWallet);
    });
    return cleanup;
  }, []);

  useEffect(() => {
    if (wallet?.address && onConnect) onConnect(wallet.address);
  }, [wallet?.address, onConnect]);

  // Close menu on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setShowMenu(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleConnect = async () => {
    setLoading(true);
    setError(null);
    try {
      const state = await connectWallet();
      setWallet(state);

      // Sign-in: request nonce, sign, verify
      if (state.address && window.ethereum) {
        const nonceRes = await fetch("/api/auth/nonce", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: state.address }),
        });
        const { message } = await nonceRes.json();

        const provider = new BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        const signature = await signer.signMessage(message);

        const verifyRes = await fetch("/api/auth/verify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ wallet: state.address, signature, message }),
        });
        const data = await verifyRes.json();
        if (data.authenticated) {
          setUser(data.user);
        }
      }
    } catch (e) {
      const msg = (e as Error).message;
      if (!msg.includes("user rejected")) setError(msg);
    }
    setLoading(false);
  };

  if (wallet?.connected) {
    return (
      <div className="relative" ref={menuRef}>
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="flex items-center gap-2 px-3 py-1.5 bg-[#161b22] border border-[#1c2333] hover:border-gray-600 rounded-lg transition"
        >
          <div className="w-2 h-2 bg-[#4ade80] rounded-full" />
          <span className="text-xs font-mono text-gray-300">
            {user?.username || `${wallet.address?.slice(0, 6)}...${wallet.address?.slice(-4)}`}
          </span>
          {wallet.balance && (
            <span className="text-xs text-gray-500">{wallet.balance} ETH</span>
          )}
          <svg className="w-3 h-3 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-56 bg-[#161b22] border border-[#1c2333] rounded-xl shadow-xl z-50 overflow-hidden">
            <div className="p-3 border-b border-[#1c2333]">
              <p className="text-sm font-semibold">{user?.username || "Anonymous"}</p>
              <p className="text-[10px] font-mono text-gray-500">{wallet.address}</p>
            </div>
            {user && (
              <div className="p-3 border-b border-[#1c2333] grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <p className="text-gray-500">Bets</p>
                  <p className="font-semibold">{user.totalBets}</p>
                </div>
                <div>
                  <p className="text-gray-500">Wins</p>
                  <p className="font-semibold text-[#4ade80]">{user.wins}</p>
                </div>
                <div>
                  <p className="text-gray-500">Profit</p>
                  <p className={`font-semibold ${(user.profit ?? 0) >= 0 ? "text-[#4ade80]" : "text-red-400"}`}>
                    ${(user.profit ?? 0).toFixed(0)}
                  </p>
                </div>
              </div>
            )}
            <div className="p-1">
              <Link
                href={`/profile/${wallet.address}`}
                className="block px-3 py-2 text-sm text-gray-300 hover:bg-[#1c2333] rounded-lg transition"
                onClick={() => setShowMenu(false)}
              >
                👤 My Profile
              </Link>
              <Link
                href="/leaderboard"
                className="block px-3 py-2 text-sm text-gray-300 hover:bg-[#1c2333] rounded-lg transition"
                onClick={() => setShowMenu(false)}
              >
                🏆 Leaderboard
              </Link>
              <button
                onClick={() => { setWallet(null); setUser(null); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-[#1c2333] rounded-lg transition"
              >
                Disconnect
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={handleConnect}
        disabled={loading}
        className="px-4 py-1.5 bg-[#4ade80] hover:bg-[#22c55e] text-black text-sm font-semibold rounded-lg transition disabled:opacity-50"
      >
        {loading ? "Connecting..." : "Connect Wallet"}
      </button>
      {error && (
        <div className="absolute top-full right-0 mt-2 p-2 bg-red-900/90 text-red-200 text-xs rounded-lg whitespace-nowrap z-50 max-w-xs">
          {error}
          <button onClick={() => setError(null)} className="ml-2 text-red-300">×</button>
        </div>
      )}
    </div>
  );
}

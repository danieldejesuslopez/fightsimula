"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Post {
  id: string;
  wallet: string;
  type: string;
  content: string;
  fight_id: string | null;
  bet_id: string | null;
  likes: number;
  created_at: string;
  liked?: boolean;
}

const tabs = [
  { key: "all", label: "All Activity", icon: "📡" },
  { key: "bets", label: "Bets", icon: "🎲" },
  { key: "wins", label: "Wins", icon: "🏆" },
  { key: "achievements", label: "Achievements", icon: "⭐" },
];

const typeIcons: Record<string, string> = {
  bet_placed: "🎲",
  bet_won: "💰",
  bet_lost: "💸",
  achievement_unlocked: "🏅",
  fight_simulated: "⚔️",
  post: "💬",
};

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "now";
  if (mins < 60) return `${mins}m`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h`;
  const days = Math.floor(hrs / 24);
  return `${days}d`;
}

function shortWallet(w: string): string {
  return w.length > 10 ? w.slice(0, 6) + "..." + w.slice(-4) : w;
}

export default function SocialPage() {
  const [posts, setPosts] = useState<Post[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("all");
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);

  const myWallet = "0xDEMO_USER";

  useEffect(() => {
    fetch(`/api/social?type=${tab}`)
      .then((r) => r.json())
      .then((data) => { setPosts(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [tab]);

  const handlePost = async () => {
    if (!newPost.trim()) return;
    setPosting(true);
    try {
      const res = await fetch("/api/social", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: myWallet, content: newPost, type: "post" }),
      });
      const post = await res.json();
      setPosts((prev) => [post, ...prev]);
      setNewPost("");
    } catch {}
    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    try {
      const res = await fetch(`/api/social/${postId}/like`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ wallet: myWallet }),
      });
      const data = await res.json();
      setPosts((prev) =>
        prev.map((p) =>
          p.id === postId ? { ...p, likes: data.likes, liked: data.liked } : p
        )
      );
    } catch {}
  };

  // Trending: count posts per fight_id
  const trendingFights = posts
    .filter((p) => p.fight_id)
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.fight_id!] = (acc[p.fight_id!] || 0) + 1;
      return acc;
    }, {});
  const topFights = Object.entries(trendingFights)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  // Hot streaks: wallets with most wins
  const winStreaks = posts
    .filter((p) => p.type === "bet_won")
    .reduce<Record<string, number>>((acc, p) => {
      acc[p.wallet] = (acc[p.wallet] || 0) + 1;
      return acc;
    }, {});
  const topStreaks = Object.entries(winStreaks)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-6xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>All<span className="text-[#4ade80]">Fights</span></span>
          </Link>
          <span className="text-gray-600">›</span>
          <span className="text-sm text-gray-400">Social Feed</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8 flex gap-6">
        {/* Main feed */}
        <div className="flex-1 min-w-0">
          <h1 className="text-3xl font-black mb-2">Social Feed</h1>
          <p className="text-gray-500 text-sm mb-6">See what the community is betting on</p>

          {/* Compose */}
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 mb-6">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-full bg-[#4ade80]/10 border border-[#4ade80]/20 flex items-center justify-center text-sm shrink-0">
                🎭
              </div>
              <div className="flex-1">
                <input
                  type="text"
                  value={newPost}
                  onChange={(e) => setNewPost(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handlePost()}
                  placeholder="Share your thoughts..."
                  className="w-full bg-[#0d1117] border border-[#1c2333] rounded-lg px-3 py-2 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#4ade80]/40"
                />
              </div>
              <button
                onClick={handlePost}
                disabled={posting || !newPost.trim()}
                className="px-4 py-2 bg-[#4ade80] text-black text-sm font-bold rounded-lg hover:bg-[#22c55e] disabled:opacity-40 disabled:cursor-not-allowed transition shrink-0"
              >
                Post
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
            {tabs.map((t) => (
              <button
                key={t.key}
                onClick={() => setTab(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition ${
                  tab === t.key
                    ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                    : "bg-[#161b22] text-gray-500 border border-[#1c2333] hover:text-gray-300"
                }`}
              >
                <span>{t.icon}</span>
                <span>{t.label}</span>
              </button>
            ))}
          </div>

          {/* Posts */}
          {loading ? (
            <p className="text-gray-600 text-center py-10">Loading...</p>
          ) : posts.length === 0 ? (
            <p className="text-gray-600 text-center py-10">No posts yet. Place some bets to see activity!</p>
          ) : (
            <div className="space-y-3">
              {posts.map((post) => (
                <div key={post.id} className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4 hover:border-[#2d3748] transition">
                  <div className="flex gap-3">
                    <div className="w-10 h-10 rounded-full bg-[#0d1117] border border-[#1c2333] flex items-center justify-center text-lg shrink-0">
                      {typeIcons[post.type] || "💬"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-sm font-bold text-[#4ade80]">{shortWallet(post.wallet)}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                          post.type === "bet_won" ? "bg-green-500/10 text-green-400" :
                          post.type === "bet_lost" ? "bg-red-500/10 text-red-400" :
                          post.type === "achievement_unlocked" ? "bg-yellow-500/10 text-yellow-400" :
                          "bg-gray-500/10 text-gray-500"
                        }`}>
                          {post.type.replace(/_/g, " ")}
                        </span>
                        <span className="text-[10px] text-gray-600">{timeAgo(post.created_at)}</span>
                      </div>
                      <p className="text-sm text-gray-300">{post.content}</p>
                      <div className="flex items-center gap-4 mt-2">
                        <button
                          onClick={() => handleLike(post.id)}
                          className={`flex items-center gap-1 text-xs transition ${
                            post.liked ? "text-red-400" : "text-gray-600 hover:text-red-400"
                          }`}
                        >
                          {post.liked ? "❤️" : "🤍"} {post.likes}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="hidden lg:block w-72 shrink-0 space-y-4">
          {/* Trending fights */}
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">🔥 Trending Fights</h3>
            {topFights.length === 0 ? (
              <p className="text-xs text-gray-600">No trending fights</p>
            ) : (
              <div className="space-y-2">
                {topFights.map(([fightId, count]) => (
                  <div key={fightId} className="flex items-center justify-between">
                    <Link href={`/fights/${fightId}`} className="text-xs text-gray-400 hover:text-[#4ade80] transition truncate">
                      {fightId.slice(0, 8)}...
                    </Link>
                    <span className="text-[10px] text-gray-600">{count} posts</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Hot streaks */}
          <div className="bg-[#161b22] rounded-xl border border-[#1c2333] p-4">
            <h3 className="text-sm font-bold mb-3 flex items-center gap-2">🔥 Hot Streaks</h3>
            {topStreaks.length === 0 ? (
              <p className="text-xs text-gray-600">No streaks yet</p>
            ) : (
              <div className="space-y-2">
                {topStreaks.map(([wallet, wins]) => (
                  <div key={wallet} className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">{shortWallet(wallet)}</span>
                    <span className="text-[10px] text-[#4ade80] font-bold">{wins} wins</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

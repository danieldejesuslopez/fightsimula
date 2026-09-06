"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

interface Article {
  id: string;
  type: "recap" | "streak" | "upset" | "rankings" | "whale" | "season";
  headline: string;
  body: string;
  category: "Recaps" | "Rankings" | "Betting" | "Streaks";
  fightId?: string;
  timestamp: string;
}

const categoryTabs = ["All", "Recaps", "Rankings", "Betting", "Streaks"] as const;

const badgeStyles: Record<string, string> = {
  Recaps: "bg-blue-500/10 text-blue-400 border-blue-500/20",
  Rankings: "bg-purple-500/10 text-purple-400 border-purple-500/20",
  Betting: "bg-yellow-500/10 text-yellow-400 border-yellow-500/20",
  Streaks: "bg-orange-500/10 text-orange-400 border-orange-500/20",
};

const typeIcons: Record<string, string> = {
  recap: "🥊",
  streak: "🔥",
  upset: "😱",
  rankings: "📊",
  whale: "🐋",
  season: "🏆",
};

function timeAgo(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

export default function NewsPage() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>("All");

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        setArticles(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filtered =
    filter === "All" ? articles : articles.filter((a) => a.category === filter);

  const tickerHeadlines = articles.slice(0, 8);

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <header className="border-b border-[#1c2333] bg-[#0d1117]/90 backdrop-blur-xl sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 h-14 flex items-center gap-4">
          <Link href="/" className="text-lg font-bold flex items-center gap-2">
            <span className="text-2xl">🥊</span>
            <span>
              All<span className="text-[#4ade80]">Fights</span>
            </span>
          </Link>
          <span className="text-gray-600">&rsaquo;</span>
          <span className="text-sm text-gray-400">News</span>
        </div>
      </header>

      {/* Breaking News Ticker */}
      {tickerHeadlines.length > 0 && (
        <div className="border-b border-[#1c2333] bg-[#161b22] overflow-hidden">
          <div className="flex items-center">
            <div className="shrink-0 bg-red-600 text-white text-[10px] font-black uppercase px-3 py-2 tracking-wider">
              Breaking
            </div>
            <div className="overflow-hidden relative flex-1">
              <div className="flex animate-[ticker_30s_linear_infinite] whitespace-nowrap">
                {[...tickerHeadlines, ...tickerHeadlines].map((a, i) => (
                  <span
                    key={`${a.id}-${i}`}
                    className="inline-flex items-center gap-2 px-6 text-xs text-gray-300"
                  >
                    <span>{typeIcons[a.type] || "📰"}</span>
                    <span>{a.headline}</span>
                    <span className="text-gray-700">|</span>
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      <main className="max-w-4xl mx-auto px-4 py-8">
        <h1 className="text-3xl font-black mb-2">AI Fight News</h1>
        <p className="text-gray-500 text-sm mb-6">
          Auto-generated coverage of the AllFights universe
        </p>

        {/* Category filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
          {categoryTabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-3 py-1.5 text-xs rounded-lg whitespace-nowrap transition ${
                filter === tab
                  ? "bg-[#4ade80]/10 text-[#4ade80] border border-[#4ade80]/20"
                  : "bg-[#161b22] text-gray-500 border border-[#1c2333] hover:text-gray-300"
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {loading ? (
          <p className="text-gray-600 text-center py-10">Loading news...</p>
        ) : filtered.length === 0 ? (
          <p className="text-gray-600 text-center py-10">No articles yet</p>
        ) : (
          <div className="space-y-3">
            {filtered.map((article) => (
              <div
                key={article.id}
                className="bg-[#161b22] rounded-xl border border-[#1c2333] p-5 hover:border-[#2d3748] transition"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-lg">
                      {typeIcons[article.type] || "📰"}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded border ${
                        badgeStyles[article.category] || ""
                      }`}
                    >
                      {article.category}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-600 shrink-0">
                    {timeAgo(article.timestamp)}
                  </span>
                </div>

                <h2 className="font-black text-sm mb-2 leading-tight">
                  {article.headline}
                </h2>
                <p className="text-xs text-gray-400 leading-relaxed mb-3">
                  {article.body}
                </p>

                {article.fightId && (
                  <Link
                    href={`/fight/${article.fightId}`}
                    className="text-[10px] text-[#4ade80] hover:underline"
                  >
                    View Fight Details &rarr;
                  </Link>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <style jsx global>{`
        @keyframes ticker {
          0% {
            transform: translateX(0);
          }
          100% {
            transform: translateX(-50%);
          }
        }
      `}</style>
    </div>
  );
}

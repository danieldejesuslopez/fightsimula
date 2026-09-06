import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") || "0xABC123";

  const db = getDb();

  // Top traders: aggregate from bets table
  const topTraders = db.prepare(`
    SELECT
      wallet,
      COUNT(*) as total_bets,
      SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) as wins,
      SUM(amount) as total_wagered,
      SUM(CASE WHEN status = 'won' THEN payout - amount ELSE -amount END) as total_profit,
      ROUND(
        SUM(CASE WHEN status = 'won' THEN payout - amount ELSE -amount END) * 100.0 /
        NULLIF(SUM(amount), 0), 1
      ) as roi,
      ROUND(
        SUM(CASE WHEN status = 'won' THEN 1 ELSE 0 END) * 100.0 /
        NULLIF(COUNT(*), 0), 1
      ) as win_rate
    FROM bets
    WHERE status IN ('won', 'lost')
    GROUP BY wallet
    HAVING COUNT(*) >= 3
    ORDER BY roi DESC
    LIMIT 20
  `).all() as Record<string, unknown>[];

  // Add follower counts
  const tradersWithFollowers = topTraders.map((t) => {
    const followers = db.prepare(
      "SELECT COUNT(*) as count FROM copy_trading WHERE leader_wallet = ? AND status = 'active'"
    ).get(t.wallet) as { count: number };
    return { ...t, followers: followers.count };
  });

  // Active copies for this wallet
  const activeCopies = db.prepare(`
    SELECT ct.*,
      (SELECT ROUND(SUM(CASE WHEN b.status = 'won' THEN b.payout - b.amount ELSE -b.amount END) * 100.0 / NULLIF(SUM(b.amount), 0), 1)
       FROM bets b WHERE b.wallet = ct.leader_wallet AND b.status IN ('won','lost')) as leader_roi,
      (SELECT ROUND(SUM(CASE WHEN b.status = 'won' THEN 1 ELSE 0 END) * 100.0 / NULLIF(COUNT(*), 0), 1)
       FROM bets b WHERE b.wallet = ct.leader_wallet AND b.status IN ('won','lost')) as leader_win_rate
    FROM copy_trading ct
    WHERE ct.follower_wallet = ? AND ct.status = 'active'
  `).all(wallet) as Record<string, unknown>[];

  return NextResponse.json({ topTraders: tradersWithFollowers, activeCopies });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { follower_wallet, leader_wallet, max_bet = 100, multiplier = 1.0 } = body;

  if (!follower_wallet || !leader_wallet) {
    return NextResponse.json({ error: "Both wallets required" }, { status: 400 });
  }
  if (follower_wallet === leader_wallet) {
    return NextResponse.json({ error: "Cannot copy yourself" }, { status: 400 });
  }

  const db = getDb();

  // Check if already copying
  const existing = db.prepare(
    "SELECT id FROM copy_trading WHERE follower_wallet = ? AND leader_wallet = ? AND status = 'active'"
  ).get(follower_wallet, leader_wallet);
  if (existing) {
    return NextResponse.json({ error: "Already copying this trader" }, { status: 400 });
  }

  const id = randomUUID();
  db.prepare(
    "INSERT INTO copy_trading (id, follower_wallet, leader_wallet, max_bet, multiplier) VALUES (?, ?, ?, ?, ?)"
  ).run(id, follower_wallet, leader_wallet, max_bet, multiplier);

  return NextResponse.json({ id, follower_wallet, leader_wallet, max_bet, multiplier, status: "active" });
}

export async function DELETE(req: Request) {
  const body = await req.json();
  const { id } = body;

  if (!id) {
    return NextResponse.json({ error: "Copy trading ID required" }, { status: 400 });
  }

  const db = getDb();
  db.prepare("UPDATE copy_trading SET status = 'stopped' WHERE id = ?").run(id);

  return NextResponse.json({ success: true });
}

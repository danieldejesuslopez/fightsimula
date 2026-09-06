import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") || "0xABC123";

  const db = getDb();

  // Ensure gambling_limits table exists
  db.exec(`
    CREATE TABLE IF NOT EXISTS gambling_limits (
      wallet TEXT PRIMARY KEY,
      daily_deposit REAL DEFAULT 500,
      daily_loss REAL DEFAULT 250,
      max_bet REAL DEFAULT 250,
      session_limit TEXT DEFAULT 'unlimited',
      cooldown TEXT DEFAULT 'none',
      self_exclusion_until TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  let limits = db.prepare("SELECT * FROM gambling_limits WHERE wallet = ?").get(wallet) as Record<string, unknown> | undefined;
  if (!limits) {
    db.prepare("INSERT INTO gambling_limits (wallet) VALUES (?)").run(wallet);
    limits = db.prepare("SELECT * FROM gambling_limits WHERE wallet = ?").get(wallet) as Record<string, unknown>;
  }

  // Calculate today's stats
  const today = new Date().toISOString().slice(0, 10);
  const todayBets = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total_deposited, COUNT(*) as bet_count FROM bets WHERE wallet = ? AND created_at >= ?"
  ).get(wallet, today) as { total_deposited: number; bet_count: number };

  const todayLosses = db.prepare(
    "SELECT COALESCE(SUM(amount), 0) as total_losses FROM bets WHERE wallet = ? AND status = 'lost' AND created_at >= ?"
  ).get(wallet, today) as { total_losses: number };

  // Bets in last hour
  const oneHourAgo = new Date(Date.now() - 3600000).toISOString();
  const lastHourBets = db.prepare(
    "SELECT COUNT(*) as count FROM bets WHERE wallet = ? AND created_at >= ?"
  ).get(wallet, oneHourAgo) as { count: number };

  return NextResponse.json({
    limits,
    stats: {
      todayDeposits: todayBets.total_deposited,
      todayLosses: todayLosses.total_losses,
      betsLastHour: lastHourBets.count,
      totalBetsToday: todayBets.bet_count,
    },
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { wallet, dailyDeposit, dailyLoss, maxBet, sessionLimit, cooldown, selfExclusion } = body;

  if (!wallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }

  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS gambling_limits (
      wallet TEXT PRIMARY KEY,
      daily_deposit REAL DEFAULT 500,
      daily_loss REAL DEFAULT 250,
      max_bet REAL DEFAULT 250,
      session_limit TEXT DEFAULT 'unlimited',
      cooldown TEXT DEFAULT 'none',
      self_exclusion_until TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    )
  `);

  let selfExclusionUntil: string | null = null;
  if (selfExclusion) {
    const now = Date.now();
    const durations: Record<string, number> = {
      "24h": 86400000,
      "7d": 604800000,
      "30d": 2592000000,
      permanent: 315360000000, // 10 years
    };
    if (durations[selfExclusion]) {
      selfExclusionUntil = new Date(now + durations[selfExclusion]).toISOString();
    }
  }

  db.prepare(`
    INSERT INTO gambling_limits (wallet, daily_deposit, daily_loss, max_bet, session_limit, cooldown, self_exclusion_until, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(wallet) DO UPDATE SET
      daily_deposit = excluded.daily_deposit,
      daily_loss = excluded.daily_loss,
      max_bet = excluded.max_bet,
      session_limit = excluded.session_limit,
      cooldown = excluded.cooldown,
      self_exclusion_until = COALESCE(excluded.self_exclusion_until, self_exclusion_until),
      updated_at = datetime('now')
  `).run(
    wallet,
    dailyDeposit ?? 500,
    dailyLoss ?? 250,
    maxBet ?? 250,
    sessionLimit ?? "unlimited",
    cooldown ?? "none",
    selfExclusionUntil
  );

  return NextResponse.json({ success: true });
}

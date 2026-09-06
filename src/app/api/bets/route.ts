import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { recordLedgerEvent } from "@/lib/ledger";
import { randomUUID } from "crypto";

export async function POST(req: Request) {
  const body = await req.json();
  const { fightId, wallet, amount, side, txHash } = body;
  const wager = Number(amount);

  if (!["A", "B"].includes(side)) {
    return NextResponse.json({ error: "Side must be A or B" }, { status: 400 });
  }
  if (!wallet || !Number.isFinite(wager) || wager <= 0) {
    return NextResponse.json({ error: "Invalid wallet or amount" }, { status: 400 });
  }

  const db = getDb();
  const fight = db.prepare("SELECT * FROM fights WHERE id = ?").get(fightId) as Record<string, unknown> | undefined;
  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  if (fight.status !== "upcoming" && fight.status !== "live") {
    return NextResponse.json({ error: "Betting is closed for this fight" }, { status: 400 });
  }

  // Responsible-gambling controls are checked server-side, not just in the UI.
  db.exec(`CREATE TABLE IF NOT EXISTS gambling_limits (
    wallet TEXT PRIMARY KEY, daily_deposit REAL DEFAULT 500, daily_loss REAL DEFAULT 250,
    max_bet REAL DEFAULT 250, session_limit TEXT DEFAULT 'unlimited', cooldown TEXT DEFAULT 'none',
    self_exclusion_until TEXT, updated_at TEXT DEFAULT (datetime('now'))
  )`);
  const limits = db.prepare("SELECT * FROM gambling_limits WHERE wallet = ?").get(wallet) as {
    daily_deposit: number; daily_loss: number; max_bet: number; cooldown: string; self_exclusion_until: string | null;
  } | undefined;
  if (limits) {
    if (limits.self_exclusion_until && new Date(limits.self_exclusion_until) > new Date()) {
      return NextResponse.json({ error: "Betting is unavailable while self-exclusion is active." }, { status: 403 });
    }
    if (wager > limits.max_bet) {
      return NextResponse.json({ error: `This wager exceeds your $${limits.max_bet.toFixed(2)} single-bet limit.` }, { status: 400 });
    }
    const today = new Date().toISOString().slice(0, 10);
    const daily = db.prepare("SELECT COALESCE(SUM(amount), 0) as wagered, COALESCE(SUM(CASE WHEN status = 'lost' THEN amount ELSE 0 END), 0) as losses FROM bets WHERE wallet = ? AND created_at >= ?")
      .get(wallet, today) as { wagered: number; losses: number };
    if (daily.wagered + wager > limits.daily_deposit) {
      return NextResponse.json({ error: "This wager would exceed your daily wagering limit." }, { status: 400 });
    }
    if (daily.losses >= limits.daily_loss) {
      return NextResponse.json({ error: "Your daily loss limit has been reached." }, { status: 400 });
    }
    const cooldownMs: Record<string, number> = { "15min": 15 * 60_000, "30min": 30 * 60_000, "1h": 60 * 60_000 };
    if (cooldownMs[limits.cooldown]) {
      const cutoff = new Date(Date.now() - cooldownMs[limits.cooldown]).toISOString();
      const lastLoss = db.prepare("SELECT 1 FROM bets WHERE wallet = ? AND status = 'lost' AND created_at >= ? LIMIT 1").get(wallet, cutoff);
      if (lastLoss) return NextResponse.json({ error: `Your ${limits.cooldown} cool-down after a loss is still active.` }, { status: 400 });
    }
  }

  const odds = side === "A" ? fight.odds_a : fight.odds_b;
  const id = randomUUID();

  db.prepare("INSERT INTO bets (id, fight_id, wallet, amount, side, odds, tx_hash) VALUES (?, ?, ?, ?, ?, ?, ?)")
    .run(id, fightId, wallet, wager, side, odds, txHash || null);

  // Insert odds_history record with current pool state
  const pools = db.prepare(
    "SELECT side, SUM(amount) as total, COUNT(*) as count FROM bets WHERE fight_id = ? GROUP BY side"
  ).all(fightId) as { side: string; total: number; count: number }[];

  const poolA = pools.find((p) => p.side === "A")?.total || 0;
  const poolB = pools.find((p) => p.side === "B")?.total || 0;
  const totalBets = pools.reduce((sum, p) => sum + p.count, 0);

  // Recalculate dynamic odds
  let dynOddsA = fight.odds_a as number;
  let dynOddsB = fight.odds_b as number;
  if (poolA > 0 && poolB > 0) {
    const total = poolA + poolB;
    const margin = 1.05;
    dynOddsA = parseFloat((margin * total / poolA).toFixed(2));
    dynOddsB = parseFloat((margin * total / poolB).toFixed(2));
  }

  db.prepare(
    "INSERT INTO odds_history (fight_id, odds_a, odds_b, pool_a, pool_b, total_bets) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(fightId, dynOddsA, dynOddsB, poolA, poolB, totalBets);

  // Preserve a reviewable trail for unusually large but permitted activity.
  if (wager >= 500) {
    db.exec(`CREATE TABLE IF NOT EXISTS integrity_alerts (
      id TEXT PRIMARY KEY, wallet TEXT, fight_id TEXT, severity TEXT NOT NULL, type TEXT NOT NULL,
      message TEXT NOT NULL, status TEXT DEFAULT 'open', metadata TEXT, created_at TEXT DEFAULT (datetime('now'))
    )`);
    db.prepare("INSERT INTO integrity_alerts (id, wallet, fight_id, severity, type, message, metadata) VALUES (?, ?, ?, ?, ?, ?, ?)")
      .run(randomUUID(), wallet, fightId, wager >= 2000 ? "high" : "medium", "unusual_size", `Large wager of $${wager.toFixed(2)} requires market-integrity review.`, JSON.stringify({ betId: id, side }));
  }

  const ledger = recordLedgerEvent({
    eventType: "bet_escrow",
    wallet, fightId, betId: id, amount: wager,
    metadata: { side, odds, userTxHash: txHash || null },
  });

  return NextResponse.json({ id, fightId, wallet, amount: wager, side, odds, txHash: txHash || null, status: "pending", ledgerTxHash: ledger.txHash, ledgerBlock: ledger.blockNumber });
}

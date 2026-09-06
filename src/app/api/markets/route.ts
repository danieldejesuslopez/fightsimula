import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fightId = searchParams.get("fightId");

  if (!fightId) {
    return NextResponse.json({ error: "fightId query param is required" }, { status: 400 });
  }

  const db = getDb();

  const markets = db.prepare("SELECT * FROM markets WHERE fight_id = ?").all(fightId) as Record<string, unknown>[];

  const result = markets.map((m) => {
    const marketBets = db.prepare(
      "SELECT selection, SUM(amount) as total, COUNT(*) as count FROM market_bets WHERE market_id = ? GROUP BY selection"
    ).all(m.id as string) as { selection: string; total: number; count: number }[];

    const bets: Record<string, { total: number; count: number }> = {};
    for (const mb of marketBets) {
      bets[mb.selection] = { total: mb.total, count: mb.count };
    }

    return {
      id: m.id,
      type: m.type,
      question: m.question,
      options: JSON.parse(m.options as string),
      status: m.status,
      result: m.result,
      bets,
    };
  });

  return NextResponse.json(result);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { marketId, wallet, amount, selection } = body;

  if (!marketId || !wallet || !amount || amount <= 0 || !selection) {
    return NextResponse.json({ error: "marketId, wallet, amount, and selection are required" }, { status: 400 });
  }

  const db = getDb();

  const market = db.prepare("SELECT * FROM markets WHERE id = ?").get(marketId) as Record<string, unknown> | undefined;
  if (!market) return NextResponse.json({ error: "Market not found" }, { status: 404 });
  if (market.status !== "open") {
    return NextResponse.json({ error: "Market is not open for betting" }, { status: 400 });
  }

  const options = JSON.parse(market.options as string) as string[];
  if (!options.includes(selection)) {
    return NextResponse.json({ error: "Invalid selection" }, { status: 400 });
  }

  // Calculate odds based on current pool distribution
  const pools = db.prepare(
    "SELECT selection, SUM(amount) as total FROM market_bets WHERE market_id = ? GROUP BY selection"
  ).all(marketId) as { selection: string; total: number }[];

  const poolMap: Record<string, number> = {};
  for (const p of pools) {
    poolMap[p.selection] = p.total;
  }
  // Add current bet to pool for odds calculation
  poolMap[selection] = (poolMap[selection] || 0) + amount;

  const totalPool = Object.values(poolMap).reduce((s, v) => s + v, 0);
  const selectionPool = poolMap[selection] || amount;
  const margin = 1.05;
  const odds = totalPool > 0 ? parseFloat((margin * totalPool / selectionPool).toFixed(2)) : 2.0;

  const id = randomUUID();
  db.prepare(
    "INSERT INTO market_bets (id, market_id, wallet, amount, selection, odds) VALUES (?, ?, ?, ?, ?, ?)"
  ).run(id, marketId, wallet, amount, selection, odds);

  return NextResponse.json({ id, marketId, wallet, amount, selection, odds, status: "pending" });
}

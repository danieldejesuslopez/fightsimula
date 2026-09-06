import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(req: NextRequest) {
  const fightId = req.nextUrl.searchParams.get("fightId");
  if (!fightId) {
    return NextResponse.json({ error: "fightId required" }, { status: 400 });
  }

  const db = getDb();
  const fight = db.prepare(`
    SELECT f.*, fa.name as fa_name, fb.name as fb_name
    FROM fights f
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    WHERE f.id = ?
  `).get(fightId) as Record<string, unknown> | undefined;

  if (!fight) {
    return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  }

  const bets = db.prepare("SELECT * FROM bets WHERE fight_id = ? ORDER BY created_at DESC").all(fightId) as Record<string, unknown>[];

  const oddsA = (fight.odds_a as number) || 2.0;
  const oddsB = (fight.odds_b as number) || 2.0;

  // Build synthetic order book depth from real bets
  const priceLevels = 15;
  const orders: { price: number; sizeA: number; sizeB: number; cumA: number; cumB: number }[] = [];

  // Spread bets across price levels around current odds
  const betsA = bets.filter((b) => b.side === "A");
  const betsB = bets.filter((b) => b.side === "B");
  const totalA = betsA.reduce((s, b) => s + (b.amount as number), 0);
  const totalB = betsB.reduce((s, b) => s + (b.amount as number), 0);

  // Generate depth levels
  for (let i = 0; i < priceLevels; i++) {
    const offset = (i - Math.floor(priceLevels / 2)) * 0.05;
    const price = parseFloat((1 / oddsA + offset * 0.1).toFixed(3)); // implied probability space

    // Synthetic volume: concentrate near current price, decay outward
    const distFromCenter = Math.abs(i - Math.floor(priceLevels / 2));
    const decay = Math.exp(-distFromCenter * 0.4);

    const baseSizeA = totalA > 0 ? (totalA / priceLevels) * decay * (1 + Math.random() * 0.3) : (50 + Math.random() * 100) * decay;
    const baseSizeB = totalB > 0 ? (totalB / priceLevels) * decay * (1 + Math.random() * 0.3) : (50 + Math.random() * 100) * decay;

    orders.push({
      price: parseFloat((oddsA + offset).toFixed(2)),
      sizeA: parseFloat(baseSizeA.toFixed(2)),
      sizeB: parseFloat(baseSizeB.toFixed(2)),
      cumA: 0,
      cumB: 0,
    });
  }

  // Sort by price and compute cumulative
  orders.sort((a, b) => a.price - b.price);
  let cumA = 0;
  let cumB = 0;
  for (let i = 0; i < orders.length; i++) {
    cumA += orders[i].sizeA;
    orders[i].cumA = parseFloat(cumA.toFixed(2));
  }
  for (let i = orders.length - 1; i >= 0; i--) {
    cumB += orders[i].sizeB;
    orders[i].cumB = parseFloat(cumB.toFixed(2));
  }

  const depthA = parseFloat(cumA.toFixed(2));
  const depthB = parseFloat(cumB.toFixed(2));
  const totalPool = parseFloat((depthA + depthB).toFixed(2));
  const spread = parseFloat(Math.abs(oddsA - oddsB).toFixed(3));

  // Recent orders from bets
  const recentOrders = bets.slice(0, 20).map((b) => ({
    id: b.id,
    time: b.created_at,
    side: b.side as string,
    amount: b.amount,
    odds: b.odds,
    type: (b.amount as number) > 200 ? "limit" : "market",
  }));

  return NextResponse.json({
    fightId,
    fighterA: fight.fa_name,
    fighterB: fight.fb_name,
    oddsA,
    oddsB,
    spread,
    totalPool,
    depthA,
    depthB,
    orders,
    recentOrders,
  });
}

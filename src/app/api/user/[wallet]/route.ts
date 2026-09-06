import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/user/[wallet] — get user profile + bet history
export async function GET(_req: Request, { params }: { params: Promise<{ wallet: string }> }) {
  const { wallet } = await params;
  const address = wallet.toLowerCase();
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE wallet = ?").get(address) as Record<string, unknown> | undefined;

  const bets = db.prepare(`
    SELECT b.*,
      f.status as fight_status,
      fa.name as fighter_a_name, fb.name as fighter_b_name,
      f.winner_id, f.method as fight_method,
      f.fighter_a_id, f.fighter_b_id
    FROM bets b
    JOIN fights f ON b.fight_id = f.id
    JOIN fighters fa ON f.fighter_a_id = fa.id
    JOIN fighters fb ON f.fighter_b_id = fb.id
    WHERE b.wallet = ?
    ORDER BY b.created_at DESC
    LIMIT 50
  `).all(address) as Record<string, unknown>[];

  const history = bets.map((b) => ({
    id: b.id,
    fightId: b.fight_id,
    matchup: `${b.fighter_a_name} vs ${b.fighter_b_name}`,
    side: b.side,
    pickedFighter: b.side === "A" ? b.fighter_a_name : b.fighter_b_name,
    amount: b.amount,
    odds: b.odds,
    status: b.status,
    payout: b.payout,
    profit: b.status === "won" ? (b.payout as number) - (b.amount as number) :
            b.status === "lost" ? -(b.amount as number) : 0,
    fightStatus: b.fight_status,
    createdAt: b.created_at,
  }));

  const profile = user ? {
    wallet: address,
    username: user.username || `Fighter_${address.slice(2, 8)}`,
    totalBets: (user.total_bets as number) || bets.length,
    wins: (user.wins as number) || bets.filter(b => b.status === "won").length,
    losses: (user.losses as number) || bets.filter(b => b.status === "lost").length,
    totalWagered: (user.total_wagered as number) || bets.reduce((s, b) => s + (b.amount as number), 0),
    totalWon: (user.total_won as number) || bets.filter(b => b.status === "won").reduce((s, b) => s + (b.payout as number), 0),
    profit: bets.reduce((s, b) => {
      if (b.status === "won") return s + ((b.payout as number) - (b.amount as number));
      if (b.status === "lost") return s - (b.amount as number);
      return s;
    }, 0),
    memberSince: user.created_at,
  } : null;

  return NextResponse.json({ profile, history });
}

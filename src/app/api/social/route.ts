import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

export async function GET(req: Request) {
  const db = getDb();
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");
  const limit = Math.min(parseInt(searchParams.get("limit") || "50"), 100);

  let posts = db.prepare(
    `SELECT * FROM social_posts ORDER BY created_at DESC LIMIT ?`
  ).all(limit) as Record<string, unknown>[];

  // Auto-generate from recent bets if no posts exist
  if (posts.length === 0) {
    const recentBets = db.prepare(`
      SELECT b.id as bet_id, b.wallet, b.amount, b.side, b.status, b.payout, b.created_at,
             f.id as fight_id, fa.name as fighter_a, fb.name as fighter_b
      FROM bets b
      JOIN fights f ON f.id = b.fight_id
      JOIN fighters fa ON fa.id = f.fighter_a_id
      JOIN fighters fb ON fb.id = f.fighter_b_id
      ORDER BY b.created_at DESC LIMIT 30
    `).all() as Record<string, unknown>[];

    for (const bet of recentBets) {
      const wallet = bet.wallet as string;
      const short = wallet.length > 10 ? wallet.slice(0, 6) + "..." + wallet.slice(-4) : wallet;
      const picked = bet.side === "A" ? bet.fighter_a : bet.fighter_b;
      let postType = "bet_placed";
      let content = `${short} bet $${bet.amount} on ${picked} in ${bet.fighter_a} vs ${bet.fighter_b}`;

      if (bet.status === "won") {
        postType = "bet_won";
        content = `${short} won $${bet.payout} betting on ${picked}! 🎉`;
      } else if (bet.status === "lost") {
        postType = "bet_lost";
        content = `${short} lost $${bet.amount} betting on ${picked}`;
      }

      const id = randomUUID();
      db.prepare(
        "INSERT INTO social_posts (id, wallet, type, content, fight_id, bet_id, likes) VALUES (?, ?, ?, ?, ?, ?, 0)"
      ).run(id, wallet, postType, content, bet.fight_id, bet.bet_id);
    }

    posts = db.prepare(
      `SELECT * FROM social_posts ORDER BY created_at DESC LIMIT ?`
    ).all(limit) as Record<string, unknown>[];
  }

  if (type && type !== "all") {
    const typeMap: Record<string, string[]> = {
      bets: ["bet_placed"],
      wins: ["bet_won"],
      achievements: ["achievement_unlocked"],
    };
    const types = typeMap[type] || [type];
    posts = posts.filter((p) => types.includes(p.type as string));
  }

  return NextResponse.json(posts);
}

export async function POST(req: Request) {
  const body = await req.json();
  const { wallet, content, type, fight_id } = body;

  if (!wallet || !content) {
    return NextResponse.json({ error: "wallet and content required" }, { status: 400 });
  }

  const db = getDb();
  const id = randomUUID();
  db.prepare(
    "INSERT INTO social_posts (id, wallet, type, content, fight_id, likes) VALUES (?, ?, ?, ?, ?, 0)"
  ).run(id, wallet, type || "post", content, fight_id || null);

  const post = db.prepare("SELECT * FROM social_posts WHERE id = ?").get(id);
  return NextResponse.json(post);
}

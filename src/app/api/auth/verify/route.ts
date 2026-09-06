import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { verifyMessage } from "ethers";

// POST /api/auth/verify — verify signed nonce, return session token
export async function POST(req: Request) {
  const { wallet, signature, message } = await req.json();
  if (!wallet || !signature || !message) {
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const address = wallet.toLowerCase();
  const db = getDb();

  const user = db.prepare("SELECT * FROM users WHERE wallet = ?").get(address) as Record<string, unknown> | undefined;
  if (!user) return NextResponse.json({ error: "User not found, request nonce first" }, { status: 404 });

  // Verify the signature
  try {
    const recovered = verifyMessage(message, signature).toLowerCase();
    if (recovered !== address) {
      return NextResponse.json({ error: "Signature mismatch" }, { status: 401 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  // Clear nonce (one-time use)
  db.prepare("UPDATE users SET nonce = NULL, last_seen = datetime('now') WHERE wallet = ?").run(address);

  // Return user profile
  return NextResponse.json({
    authenticated: true,
    user: {
      wallet: address,
      username: user.username || `Fighter_${address.slice(2, 8)}`,
      balance: user.balance,
      totalWagered: user.total_wagered,
      totalWon: user.total_won,
      totalBets: user.total_bets,
      wins: user.wins,
      losses: user.losses,
    },
  });
}

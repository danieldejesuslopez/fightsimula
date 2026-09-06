import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

function generateCode(): string {
  return "AF" + Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet") || "0xABC123";

  const db = getDb();

  // Get or create referral code
  let codeRow = db.prepare("SELECT * FROM referral_codes WHERE wallet = ?").get(wallet) as Record<string, unknown> | undefined;
  if (!codeRow) {
    const code = generateCode();
    db.prepare("INSERT INTO referral_codes (code, wallet) VALUES (?, ?)").run(code, wallet);
    codeRow = { code, wallet, uses: 0, created_at: new Date().toISOString() };
  }

  // Referral stats
  const stats = db.prepare(`
    SELECT
      COUNT(*) as total_referrals,
      SUM(total_earned) as total_earned
    FROM referrals
    WHERE referrer_wallet = ? AND status = 'active'
  `).get(wallet) as { total_referrals: number; total_earned: number };

  // Referred users with their volume
  const referees = db.prepare(`
    SELECT
      r.referee_wallet as wallet,
      r.created_at as joined,
      r.total_earned as your_earnings,
      COALESCE((SELECT SUM(amount) FROM bets WHERE wallet = r.referee_wallet), 0) as volume
    FROM referrals r
    WHERE r.referrer_wallet = ? AND r.status = 'active'
    ORDER BY r.created_at DESC
  `).all(wallet) as Record<string, unknown>[];

  // Determine tier
  const count = stats.total_referrals || 0;
  const tier = count >= 20 ? { name: "Gold", rate: 10, min: 20 }
    : count >= 5 ? { name: "Silver", rate: 7.5, min: 5 }
    : { name: "Bronze", rate: 5, min: 0 };

  return NextResponse.json({
    code: codeRow.code,
    stats: {
      total_referrals: stats.total_referrals || 0,
      total_earned: stats.total_earned || 0,
      pending: 0,
    },
    tier,
    referees,
  });
}

export async function POST(req: Request) {
  const body = await req.json();
  const { wallet, action, code } = body;

  if (!wallet) {
    return NextResponse.json({ error: "Wallet required" }, { status: 400 });
  }

  const db = getDb();

  if (action === "generate") {
    const existing = db.prepare("SELECT code FROM referral_codes WHERE wallet = ?").get(wallet) as { code: string } | undefined;
    if (existing) {
      return NextResponse.json({ code: existing.code });
    }
    const newCode = generateCode();
    db.prepare("INSERT INTO referral_codes (code, wallet) VALUES (?, ?)").run(newCode, wallet);
    return NextResponse.json({ code: newCode });
  }

  if (action === "use" && code) {
    // Find referrer
    const codeRow = db.prepare("SELECT * FROM referral_codes WHERE code = ?").get(code) as Record<string, unknown> | undefined;
    if (!codeRow) {
      return NextResponse.json({ error: "Invalid referral code" }, { status: 400 });
    }
    if (codeRow.wallet === wallet) {
      return NextResponse.json({ error: "Cannot use your own code" }, { status: 400 });
    }
    // Check if already referred
    const existing = db.prepare("SELECT id FROM referrals WHERE referee_wallet = ?").get(wallet);
    if (existing) {
      return NextResponse.json({ error: "Already used a referral code" }, { status: 400 });
    }

    const id = randomUUID();
    db.prepare(
      "INSERT INTO referrals (id, referrer_wallet, referee_wallet, code) VALUES (?, ?, ?, ?)"
    ).run(id, codeRow.wallet, wallet, code);
    db.prepare("UPDATE referral_codes SET uses = uses + 1 WHERE code = ?").run(code);

    return NextResponse.json({ success: true, referrer: codeRow.wallet });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomBytes } from "crypto";

// POST /api/auth/nonce — get a nonce to sign for wallet auth
export async function POST(req: Request) {
  const { wallet } = await req.json();
  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });

  const db = getDb();
  const nonce = randomBytes(16).toString("hex");
  const address = wallet.toLowerCase();

  const existing = db.prepare("SELECT * FROM users WHERE wallet = ?").get(address);
  if (existing) {
    db.prepare("UPDATE users SET nonce = ?, last_seen = datetime('now') WHERE wallet = ?").run(nonce, address);
  } else {
    db.prepare("INSERT INTO users (wallet, nonce) VALUES (?, ?)").run(address, nonce);
  }

  return NextResponse.json({
    nonce,
    message: `Sign this message to authenticate with AllFights.\n\nWallet: ${address}\nNonce: ${nonce}`,
  });
}

import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

// GET /api/notifications?wallet=0x... — get user notifications
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const wallet = searchParams.get("wallet")?.toLowerCase();
  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });

  const db = getDb();
  const notifications = db.prepare(
    "SELECT * FROM notifications WHERE wallet = ? ORDER BY created_at DESC LIMIT 50"
  ).all(wallet);

  const unread = db.prepare(
    "SELECT COUNT(*) as count FROM notifications WHERE wallet = ? AND read = 0"
  ).get(wallet) as { count: number };

  return NextResponse.json({ notifications, unreadCount: unread.count });
}

// PATCH /api/notifications — mark notifications as read
export async function PATCH(req: Request) {
  const { wallet, ids } = await req.json();
  if (!wallet) return NextResponse.json({ error: "Wallet required" }, { status: 400 });

  const db = getDb();
  const address = wallet.toLowerCase();

  if (ids && Array.isArray(ids)) {
    const placeholders = ids.map(() => "?").join(",");
    db.prepare(`UPDATE notifications SET read = 1 WHERE wallet = ? AND id IN (${placeholders})`).run(address, ...ids);
  } else {
    db.prepare("UPDATE notifications SET read = 1 WHERE wallet = ?").run(address);
  }

  return NextResponse.json({ ok: true });
}

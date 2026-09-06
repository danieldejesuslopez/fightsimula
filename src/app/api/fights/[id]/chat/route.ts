import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { sanitizeChatMessage } from "@/lib/chatFilter";
import { randomUUID } from "crypto";

// GET /api/fights/[id]/chat?afterId=N — polling fetch of new messages
export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const afterId = searchParams.get("afterId");
  const db = getDb();

  const rows = afterId
    ? db.prepare("SELECT *, rowid as seq FROM fight_chat_messages WHERE fight_id = ? AND rowid > ? ORDER BY rowid ASC LIMIT 200").all(id, Number(afterId))
    : db.prepare("SELECT *, rowid as seq FROM fight_chat_messages WHERE fight_id = ? ORDER BY rowid DESC LIMIT 50").all(id).reverse();

  return NextResponse.json(rows);
}

const lastMessageAt = new Map<string, number>();

// POST /api/fights/[id]/chat — post a message. Simple per-wallet rate limit + filter.
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const body = await req.json();
  const wallet = typeof body.wallet === "string" && body.wallet.trim() ? body.wallet.trim() : "0xDEMO";
  const username = typeof body.username === "string" ? body.username.trim().slice(0, 32) : null;

  const db = getDb();
  const fight = db.prepare("SELECT id FROM fights WHERE id = ?").get(id);
  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });

  const rateLimitKey = `${id}:${wallet}`;
  const now = Date.now();
  const last = lastMessageAt.get(rateLimitKey) ?? 0;
  if (now - last < 1200) {
    return NextResponse.json({ error: "You're sending messages too fast" }, { status: 429 });
  }

  const sanitized = sanitizeChatMessage(String(body.message ?? ""));
  if (!sanitized.ok) return NextResponse.json({ error: sanitized.error }, { status: 400 });

  lastMessageAt.set(rateLimitKey, now);

  const messageId = randomUUID();
  db.prepare("INSERT INTO fight_chat_messages (id, fight_id, wallet, username, message) VALUES (?, ?, ?, ?, ?)")
    .run(messageId, id, wallet, username, sanitized.message);

  const inserted = db.prepare("SELECT *, rowid as seq FROM fight_chat_messages WHERE id = ?").get(messageId);
  return NextResponse.json(inserted);
}

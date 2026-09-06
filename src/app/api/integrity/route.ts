import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID } from "crypto";

type Alert = {
  id: string;
  wallet: string | null;
  fightId: string | null;
  severity: "low" | "medium" | "high";
  type: string;
  message: string;
  status: string;
  metadata?: string | null;
  createdAt?: string;
};

function scan(db: ReturnType<typeof getDb>) {
  const alerts: Alert[] = [];
  const recent = new Date(Date.now() - 60 * 60 * 1000).toISOString();

  const rapidWallets = db.prepare(`
    SELECT wallet, fight_id as fightId, COUNT(*) as count, SUM(amount) as volume
    FROM bets WHERE created_at >= ? GROUP BY wallet, fight_id HAVING COUNT(*) >= 5
  `).all(recent) as { wallet: string; fightId: string; count: number; volume: number }[];
  for (const item of rapidWallets) {
    alerts.push({
      id: `rapid-${item.wallet}-${item.fightId}`,
      wallet: item.wallet,
      fightId: item.fightId,
      severity: item.count >= 10 ? "high" : "medium",
      type: "rapid_betting",
      message: `${item.count} wagers placed on one fight within the last hour ($${item.volume.toFixed(2)} total).`,
      status: "open",
    });
  }

  const whales = db.prepare(`
    SELECT id, wallet, fight_id as fightId, amount FROM bets WHERE amount >= 500 AND created_at >= ?
  `).all(recent) as { id: string; wallet: string; fightId: string; amount: number }[];
  for (const item of whales) {
    alerts.push({
      id: `whale-${item.id}`,
      wallet: item.wallet,
      fightId: item.fightId,
      severity: item.amount >= 2000 ? "high" : "medium",
      type: "unusual_size",
      message: `Large wager of $${item.amount.toFixed(2)} requires market-integrity review.`,
      status: "open",
    });
  }

  const imbalances = db.prepare(`
    SELECT fight_id as fightId, side, SUM(amount) as sideVolume,
      (SELECT SUM(amount) FROM bets b2 WHERE b2.fight_id = b1.fight_id) as totalVolume
    FROM bets b1 GROUP BY fight_id, side
  `).all() as { fightId: string; side: string; sideVolume: number; totalVolume: number }[];
  for (const item of imbalances) {
    if (item.totalVolume >= 250 && item.sideVolume / item.totalVolume >= 0.9) {
      alerts.push({
        id: `imbalance-${item.fightId}-${item.side}`,
        wallet: null,
        fightId: item.fightId,
        severity: "low",
        type: "market_imbalance",
        message: `${Math.round((item.sideVolume / item.totalVolume) * 100)}% of volume is concentrated on side ${item.side}.`,
        status: "open",
      });
    }
  }
  return alerts;
}

export async function GET() {
  const db = getDb();
  const generated = scan(db);
  const saved = db.prepare(`
    SELECT id, wallet, fight_id as fightId, severity, type, message, status, metadata, created_at as createdAt
    FROM integrity_alerts ORDER BY created_at DESC LIMIT 50
  `).all() as Alert[];
  const ids = new Set(saved.map((alert) => alert.id));
  const alerts = [...generated.filter((alert) => !ids.has(alert.id)), ...saved];
  const summary = {
    open: alerts.filter((alert) => alert.status === "open").length,
    high: alerts.filter((alert) => alert.status === "open" && alert.severity === "high").length,
    reviewed: alerts.filter((alert) => alert.status === "reviewed").length,
  };
  return NextResponse.json({ alerts, summary, scannedAt: new Date().toISOString() });
}

export async function POST(req: Request) {
  const { action, alert } = await req.json();
  const db = getDb();
  if (action === "record" && alert?.type && alert?.message) {
    const id = randomUUID();
    db.prepare(`INSERT INTO integrity_alerts (id, wallet, fight_id, severity, type, message, metadata)
      VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(id, alert.wallet ?? null, alert.fightId ?? null, alert.severity ?? "low", alert.type, alert.message, JSON.stringify(alert.metadata ?? {}));
    return NextResponse.json({ id });
  }
  if (action === "review" && alert?.id) {
    db.prepare("UPDATE integrity_alerts SET status = 'reviewed' WHERE id = ?").run(alert.id);
    return NextResponse.json({ success: true });
  }
  return NextResponse.json({ error: "Unsupported integrity action" }, { status: 400 });
}

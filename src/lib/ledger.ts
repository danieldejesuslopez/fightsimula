import { getDb } from "@/lib/db";
import { randomBytes, randomUUID } from "crypto";

// Simulated on-chain settlement ledger. This models what an audited escrow
// contract + block confirmations would look like so the UI/API shape matches
// a real chain integration, but it is NOT backed by a real network, real
// custody, or real capital. See PROJECT_HANDOFF.md "Known production gaps".

let simulatedBlockHeight = 18_500_000 + Math.floor(Date.now() / 12_000);

function nextBlock(): number {
  simulatedBlockHeight += 1;
  return simulatedBlockHeight;
}

function fakeTxHash(): string {
  return `0x${randomBytes(32).toString("hex")}`;
}

export type LedgerEventType =
  | "escrow_deposit"
  | "bet_escrow"
  | "market_escrow"
  | "settlement_payout"
  | "settlement_refund";

export function recordLedgerEvent(entry: {
  eventType: LedgerEventType;
  wallet?: string | null;
  fightId?: string | null;
  betId?: string | null;
  amount?: number | null;
  metadata?: Record<string, unknown>;
}): { id: string; txHash: string; blockNumber: number } {
  const db = getDb();
  const id = randomUUID();
  const txHash = fakeTxHash();
  const blockNumber = nextBlock();

  db.prepare(`
    INSERT INTO chain_ledger (id, block_number, tx_hash, event_type, wallet, fight_id, bet_id, amount, confirmations, metadata)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `).run(id, blockNumber, txHash, entry.eventType, entry.wallet ?? null, entry.fightId ?? null, entry.betId ?? null, entry.amount ?? null, entry.metadata ? JSON.stringify(entry.metadata) : null);

  return { id, txHash, blockNumber };
}

export function getLedgerForFight(fightId: string) {
  const db = getDb();
  return db.prepare("SELECT * FROM chain_ledger WHERE fight_id = ? ORDER BY block_number ASC").all(fightId);
}

export function getLedgerForWallet(wallet: string, limit = 100) {
  const db = getDb();
  return db.prepare("SELECT * FROM chain_ledger WHERE wallet = ? ORDER BY block_number DESC LIMIT ?").all(wallet, limit);
}

export function getRecentLedger(limit = 100) {
  const db = getDb();
  return db.prepare("SELECT * FROM chain_ledger ORDER BY block_number DESC LIMIT ?").all(limit);
}

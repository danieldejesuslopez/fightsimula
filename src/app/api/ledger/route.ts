import { NextResponse } from "next/server";
import { getLedgerForFight, getLedgerForWallet, getRecentLedger } from "@/lib/ledger";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const fightId = searchParams.get("fightId");
  const wallet = searchParams.get("wallet");

  if (fightId) return NextResponse.json(getLedgerForFight(fightId));
  if (wallet) return NextResponse.json(getLedgerForWallet(wallet));
  return NextResponse.json(getRecentLedger());
}

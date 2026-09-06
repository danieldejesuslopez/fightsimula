import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { simulateFight, type FighterStats } from "@/lib/simulation";
import { recordLedgerEvent } from "@/lib/ledger";
import { randomUUID } from "crypto";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const fight = db.prepare("SELECT * FROM fights WHERE id = ?").get(id) as Record<string, unknown> | undefined;
  if (!fight) return NextResponse.json({ error: "Fight not found" }, { status: 404 });
  if (fight.status !== "upcoming") return NextResponse.json({ error: "Fight already started" }, { status: 400 });

  const a = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fight.fighter_a_id as string) as FighterStats;
  const b = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fight.fighter_b_id as string) as FighterStats;

  const clientSeed = (fight.client_seed as string) ?? "default";
  const result = simulateFight(a, b, fight.rounds as number, fight.server_seed as string, clientSeed, fight.nonce as number);

  const winnerId = result.winner === "A" ? a.id : result.winner === "B" ? b.id : null;
  const now = new Date().toISOString();

  db.prepare(`
    UPDATE fights SET status = 'finished', started_at = ?, ended_at = ?, winner_id = ?, method = ?, sim_log = ?, updated_at = ?
    WHERE id = ?
  `).run(now, now, winnerId, result.method, JSON.stringify(result.rounds), now, id);

  // Resolve bets
  const bets = db.prepare("SELECT * FROM bets WHERE fight_id = ?").all(id) as { id: string; side: string; amount: number; odds: number; wallet: string }[];
  const winnerName = result.winner === "A" ? a.name : result.winner === "B" ? b.name : "Draw";
  const matchup = `${a.name} vs ${b.name}`;
  for (const bet of bets) {
    const won = (bet.side === "A" && result.winner === "A") || (bet.side === "B" && result.winner === "B");
    const status = won ? "won" : result.winner === "DRAW" ? "refunded" : "lost";
    const payout = won ? bet.amount * bet.odds : result.winner === "DRAW" ? bet.amount : 0;
    db.prepare("UPDATE bets SET status = ?, payout = ? WHERE id = ?").run(status, payout, bet.id);

    // Update user stats
    const userExists = db.prepare("SELECT 1 FROM users WHERE wallet = ?").get(bet.wallet);
    if (userExists) {
      if (won) {
        db.prepare("UPDATE users SET total_bets = total_bets + 1, wins = wins + 1, total_wagered = total_wagered + ?, total_won = total_won + ? WHERE wallet = ?")
          .run(bet.amount, payout, bet.wallet);
      } else {
        db.prepare("UPDATE users SET total_bets = total_bets + 1, losses = losses + 1, total_wagered = total_wagered + ? WHERE wallet = ?")
          .run(bet.amount, bet.wallet);
      }
    }

    // Create notification
    const notifId = randomUUID();
    if (won) {
      db.prepare("INSERT INTO notifications (id, wallet, type, title, message, fight_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(notifId, bet.wallet, "bet_won", "🎉 You won!",
          `Your bet on ${matchup} paid out! ${winnerName} won by ${result.method}. You earned $${payout.toFixed(2)} from your $${bet.amount} bet.`, id);
    } else if (result.winner === "DRAW") {
      db.prepare("INSERT INTO notifications (id, wallet, type, title, message, fight_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(notifId, bet.wallet, "bet_refunded", "↩️ Bet refunded",
          `${matchup} ended in a draw. Your $${bet.amount} bet has been refunded.`, id);
    } else {
      db.prepare("INSERT INTO notifications (id, wallet, type, title, message, fight_id) VALUES (?, ?, ?, ?, ?, ?)")
        .run(notifId, bet.wallet, "bet_lost", "Fight settled",
          `${matchup} is over. ${winnerName} won by ${result.method}. Your $${bet.amount} bet on ${bet.side === "A" ? a.name : b.name} did not win.`, id);
    }

    if (payout > 0) {
      recordLedgerEvent({
        eventType: result.winner === "DRAW" ? "settlement_refund" : "settlement_payout",
        wallet: bet.wallet, fightId: id, betId: bet.id, amount: payout,
        metadata: { side: bet.side, status },
      });
    }
  }

  // Update fighter ELO and stats
  if (result.winner !== "DRAW") {
    const winner = result.winner === "A" ? a : b;
    const loser = result.winner === "A" ? b : a;

    // Standard ELO formula
    const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
    const expectedLoser = 1 - expectedWinner;
    const K = 32;
    const eloGain = Math.round(K * (1 - expectedWinner));
    const eloLoss = Math.round(K * (0 - expectedLoser));

    const winnerNewElo = winner.elo + eloGain;
    const loserNewElo = Math.max(0, loser.elo + eloLoss);

    // Determine win type column
    const method = result.method;
    let winTypeCol = "dec_wins";
    if (method === "KO" || method === "TKO") winTypeCol = "ko_wins";
    else if (method === "SUB") winTypeCol = "sub_wins";

    db.prepare(`UPDATE fighters SET elo = ?, wins = wins + 1, streak = CASE WHEN streak >= 0 THEN streak + 1 ELSE 1 END, ${winTypeCol} = ${winTypeCol} + 1 WHERE id = ?`)
      .run(winnerNewElo, winner.id);
    db.prepare("UPDATE fighters SET elo = ?, losses = losses + 1, streak = CASE WHEN streak <= 0 THEN streak - 1 ELSE -1 END WHERE id = ?")
      .run(loserNewElo, loser.id);

    // Insert fighter_history records
    const winHistId = randomUUID();
    const loseHistId = randomUUID();
    db.prepare(`INSERT INTO fighter_history (id, fighter_id, fight_id, opponent_id, result, method, elo_before, elo_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(winHistId, winner.id, id, loser.id, "win", result.method, winner.elo, winnerNewElo);
    db.prepare(`INSERT INTO fighter_history (id, fighter_id, fight_id, opponent_id, result, method, elo_before, elo_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
      .run(loseHistId, loser.id, id, winner.id, "loss", result.method, loser.elo, loserNewElo);
  }

  // Resolve markets for this fight
  const markets = db.prepare("SELECT * FROM markets WHERE fight_id = ? AND status = 'open'").all(id) as Record<string, unknown>[];
  for (const market of markets) {
    const marketType = market.type as string;
    let marketResult: string | null = null;

    // Determine market result based on fight outcome
    if (marketType === "winner") {
      marketResult = result.winner === "A" ? a.name : result.winner === "B" ? b.name : "Draw";
    } else if (marketType === "method") {
      if (result.method === "KO" || result.method === "TKO") marketResult = "KO/TKO";
      else if (result.method === "SUB") marketResult = "Submission";
      else marketResult = "Decision";
    } else if (marketType === "round") {
      const maxRounds = fight.rounds as number;
      if (result.method === "DEC" || result.method === "DRAW") {
        marketResult = "Goes the distance";
      } else {
        marketResult = `Round ${result.totalRounds}`;
      }
    } else if (marketType === "over_under") {
      marketResult = result.totalRounds > 1 ? "Over 1.5" : "Under 1.5";
    } else if (marketType === "method_round") {
      marketResult = `${result.method} Round ${result.totalRounds}`;
    } else if (marketType === "goes_distance") {
      marketResult = result.method === "DEC" || result.method === "DRAW" ? "Yes" : "No";
    }

    if (marketResult) {
      db.prepare("UPDATE markets SET status = 'resolved', result = ? WHERE id = ?")
        .run(marketResult, market.id as string);

      // Resolve market bets
      const marketBets = db.prepare("SELECT * FROM market_bets WHERE market_id = ?")
        .all(market.id as string) as { id: string; selection: string; amount: number; odds: number; wallet: string }[];

      for (const mb of marketBets) {
        const won = mb.selection === marketResult;
        const status = won ? "won" : "lost";
        const payout = won ? mb.amount * mb.odds : 0;
        db.prepare("UPDATE market_bets SET status = ?, payout = ? WHERE id = ?")
          .run(status, payout, mb.id);
      }
    }
  }

  return NextResponse.json({
    fight: { id, winnerId, method: result.method, serverSeed: fight.server_seed, seedHash: fight.seed_hash },
    result,
  });
}

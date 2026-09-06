import { getDb } from "@/lib/db";
import { simulateFight, calculateOdds, type FighterStats } from "@/lib/simulation";
import { generateCommentary, generateRoundStartCommentary, generateRoundEndCommentary } from "@/lib/commentary";
import { recordLedgerEvent } from "@/lib/ledger";
import { randomUUID } from "crypto";

// GET /api/fights/[id]/live — SSE stream that simulates the fight in real time
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const db = getDb();

  const encoder = new TextEncoder();
  let closed = false;

  const stream = new ReadableStream({
    async start(controller) {
      const send = (data: unknown) => {
        if (closed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          closed = true;
        }
      };

      const fight = db.prepare("SELECT * FROM fights WHERE id = ?").get(id) as Record<string, unknown> | undefined;
      if (!fight) {
        send({ type: "error", message: "Fight not found" });
        controller.close();
        return;
      }

      // If already finished, send the result immediately from stored sim_log
      if (fight.status === "finished") {
        const a = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fight.fighter_a_id as string) as FighterStats;
        const b = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fight.fighter_b_id as string) as FighterStats;
        const rounds = fight.sim_log ? JSON.parse(fight.sim_log as string) : [];
        send({ type: "already_finished", winnerId: fight.winner_id, method: fight.method, rounds, fighterA: a.name, fighterB: b.name });
        controller.close();
        return;
      }

      // Only stream if fight is 'live' (or 'upcoming' — we auto-set to live)
      if (fight.status !== "live" && fight.status !== "upcoming") {
        send({ type: "error", message: "Fight is not available for live streaming" });
        controller.close();
        return;
      }

      const a = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fight.fighter_a_id as string) as FighterStats;
      const b = db.prepare("SELECT * FROM fighters WHERE id = ?").get(fight.fighter_b_id as string) as FighterStats;

      // Set fight to live
      if (fight.status === "upcoming") {
        db.prepare("UPDATE fights SET status = 'live', started_at = ?, updated_at = ? WHERE id = ?")
          .run(new Date().toISOString(), new Date().toISOString(), id);
      }

      // Run simulation to get all rounds
      const clientSeed = (fight.client_seed as string) ?? "default";
      const maxRounds = fight.rounds as number;
      const result = simulateFight(a, b, maxRounds, fight.server_seed as string, clientSeed, fight.nonce as number);

      // Calculate initial odds
      const initialOdds = calculateOdds(a, b);
      send({
        type: "fight_start",
        fighterA: { id: a.id, name: a.name, style: a.style },
        fighterB: { id: b.id, name: b.name, style: b.style },
        maxRounds,
        oddsA: initialOdds.oddsA,
        oddsB: initialOdds.oddsB,
      });

      // Stream events with delays
      let hpA = 100;
      let hpB = 100;
      let totalScoreA = 0;
      let totalScoreB = 0;
      const delays: { fn: () => void; delay: number }[] = [];
      let cumulativeDelay = 500; // initial pause

      for (let ri = 0; ri < result.rounds.length; ri++) {
        const round = result.rounds[ri];

        // Round start
        const roundStartDelay = cumulativeDelay;
        delays.push({
          delay: roundStartDelay,
          fn: () => {
            const commentary = generateRoundStartCommentary(round.round, a.name, b.name);
            send({ type: "round_start", round: round.round, maxRounds, commentary });
          },
        });
        cumulativeDelay += 1500;

        // Events within the round
        for (let ei = 0; ei < round.events.length; ei++) {
          const event = round.events[ei];
          const eventDelay = cumulativeDelay;

          // Calculate progressive HP from this event
          const isStrikeA = event.toLowerCase().includes(a.name.toLowerCase()) && event.includes("lands");
          const isStrikeB = event.toLowerCase().includes(b.name.toLowerCase()) && event.includes("lands");
          const isTakedownA = event.toLowerCase().includes(a.name.toLowerCase()) && event.includes("takedown");
          const isTakedownB = event.toLowerCase().includes(b.name.toLowerCase()) && event.includes("takedown");

          if (isStrikeA || isTakedownA) {
            const dmg = event.includes("heavy") ? 8 : 4;
            hpB = Math.max(0, hpB - dmg);
          } else if (isStrikeB || isTakedownB) {
            const dmg = event.includes("heavy") ? 8 : 4;
            hpA = Math.max(0, hpA - dmg);
          }

          const snapHpA = hpA;
          const snapHpB = hpB;

          delays.push({
            delay: eventDelay,
            fn: () => {
              const commentary = generateCommentary(event, a.name, b.name, round.round);
              send({
                type: "event",
                round: round.round,
                text: event,
                fighterA_hp: Math.round(snapHpA),
                fighterB_hp: Math.round(snapHpB),
                scoreA: round.scoreA,
                scoreB: round.scoreB,
                commentary,
              });
            },
          });

          // 1-3 seconds between events
          cumulativeDelay += 1000 + Math.random() * 2000;
        }

        totalScoreA += round.scoreA;
        totalScoreB += round.scoreB;

        // Round end
        const roundEndDelay = cumulativeDelay;
        const snapTotalA = totalScoreA;
        const snapTotalB = totalScoreB;
        delays.push({
          delay: roundEndDelay,
          fn: () => {
            const commentary = generateRoundEndCommentary(round.round, a.name, b.name);
            send({ type: "round_end", round: round.round, scoreA: round.scoreA, scoreB: round.scoreB, totalScoreA: snapTotalA, totalScoreB: snapTotalB, commentary });
          },
        });
        cumulativeDelay += 1000;

        // Odds update after each round
        const oddsDelay = cumulativeDelay;
        const snapHpA2 = hpA;
        const snapHpB2 = hpB;
        delays.push({
          delay: oddsDelay,
          fn: () => {
            // Shift odds based on HP and scores
            const hpRatio = snapHpA2 / (snapHpA2 + snapHpB2 + 1);
            const scoreRatio = snapTotalA / (snapTotalA + snapTotalB + 1);
            const combined = (hpRatio + scoreRatio) / 2;
            const margin = 1.05;
            const oddsA = parseFloat((margin / Math.max(combined, 0.05)).toFixed(2));
            const oddsB = parseFloat((margin / Math.max(1 - combined, 0.05)).toFixed(2));
            send({ type: "odds_update", oddsA, oddsB, round: round.round });
          },
        });
        cumulativeDelay += 500;

        // Finish in this round?
        if (round.finish) {
          if (round.finish.winner === "A") hpB = 0;
          else hpA = 0;

          const finishDelay = cumulativeDelay;
          const snapFinalHpA = hpA;
          const snapFinalHpB = hpB;
          delays.push({
            delay: finishDelay,
            fn: () => {
              send({
                type: "finish",
                winner: round.finish!.winner === "A" ? a.id : b.id,
                winnerName: round.finish!.winner === "A" ? a.name : b.name,
                method: round.finish!.method,
                round: round.round,
                fighterA_hp: snapFinalHpA,
                fighterB_hp: snapFinalHpB,
              });
            },
          });
          break;
        }
      }

      // If decision (no finish)
      if (!result.rounds.some(r => r.finish)) {
        const finishDelay = cumulativeDelay + 1000;
        delays.push({
          delay: finishDelay,
          fn: () => {
            const winnerId = result.winner === "A" ? a.id : result.winner === "B" ? b.id : null;
            const winnerName = result.winner === "A" ? a.name : result.winner === "B" ? b.name : "Draw";
            send({
              type: "finish",
              winner: winnerId,
              winnerName,
              method: result.method,
              round: maxRounds,
              fighterA_hp: Math.round(hpA),
              fighterB_hp: Math.round(hpB),
            });
          },
        });
      }

      // Execute all delays
      const timers: ReturnType<typeof setTimeout>[] = [];
      for (const d of delays) {
        const timer = setTimeout(() => {
          if (!closed) d.fn();
        }, d.delay);
        timers.push(timer);
      }

      // After the last event, update DB (same logic as simulate route)
      const lastDelay = delays[delays.length - 1]?.delay ?? 0;
      const finalTimer = setTimeout(() => {
        if (closed) return;
        const winnerId = result.winner === "A" ? a.id : result.winner === "B" ? b.id : null;
        const now = new Date().toISOString();

        db.prepare(`
          UPDATE fights SET status = 'finished', ended_at = ?, winner_id = ?, method = ?, sim_log = ?, updated_at = ?
          WHERE id = ?
        `).run(now, winnerId, result.method, JSON.stringify(result.rounds), now, id);

        // Resolve bets
        const bets = db.prepare("SELECT * FROM bets WHERE fight_id = ?").all(id) as { id: string; side: string; amount: number; odds: number; wallet: string }[];
        const winnerName = result.winner === "A" ? a.name : result.winner === "B" ? b.name : "Draw";
        const matchup = `${a.name} vs ${b.name}`;
        for (const bet of bets) {
          const won = (bet.side === "A" && result.winner === "A") || (bet.side === "B" && result.winner === "B");
          const status = won ? "won" : result.winner === "DRAW" ? "refunded" : "lost";
          const payout = won ? bet.amount * bet.odds : result.winner === "DRAW" ? bet.amount : 0;
          db.prepare("UPDATE bets SET status = ?, payout = ? WHERE id = ?").run(status, payout, bet.id);

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
          const notificationId = randomUUID();
          const title = won ? "🎉 You won!" : result.winner === "DRAW" ? "↩️ Bet refunded" : "Fight settled";
          const message = won
            ? `Your live bet on ${matchup} paid $${payout.toFixed(2)}.`
            : result.winner === "DRAW" ? `${matchup} ended in a draw; your bet was refunded.`
            : `${winnerName} won ${matchup} by ${result.method}.`;
          db.prepare("INSERT INTO notifications (id, wallet, type, title, message, fight_id) VALUES (?, ?, ?, ?, ?, ?)")
            .run(notificationId, bet.wallet, won ? "bet_won" : result.winner === "DRAW" ? "bet_refunded" : "bet_lost", title, message, id);

          if (payout > 0) {
            recordLedgerEvent({
              eventType: result.winner === "DRAW" ? "settlement_refund" : "settlement_payout",
              wallet: bet.wallet, fightId: id, betId: bet.id, amount: payout,
              metadata: { side: bet.side, status },
            });
          }
        }

        // Update fighter ELO
        if (result.winner !== "DRAW") {
          const winner = result.winner === "A" ? a : b;
          const loser = result.winner === "A" ? b : a;
          const expectedWinner = 1 / (1 + Math.pow(10, (loser.elo - winner.elo) / 400));
          const K = 32;
          const eloGain = Math.round(K * (1 - expectedWinner));
          const eloLoss = Math.round(K * (0 - (1 - expectedWinner)));
          const winnerNewElo = winner.elo + eloGain;
          const loserNewElo = Math.max(0, loser.elo + eloLoss);

          let winTypeCol = "dec_wins";
          if (result.method === "KO" || result.method === "TKO") winTypeCol = "ko_wins";
          else if (result.method === "SUB") winTypeCol = "sub_wins";

          db.prepare(`UPDATE fighters SET elo = ?, wins = wins + 1, streak = CASE WHEN streak >= 0 THEN streak + 1 ELSE 1 END, ${winTypeCol} = ${winTypeCol} + 1 WHERE id = ?`)
            .run(winnerNewElo, winner.id);
          db.prepare("UPDATE fighters SET elo = ?, losses = losses + 1, streak = CASE WHEN streak <= 0 THEN streak - 1 ELSE -1 END WHERE id = ?")
            .run(loserNewElo, loser.id);
          db.prepare("INSERT INTO fighter_history (id, fighter_id, fight_id, opponent_id, result, method, elo_before, elo_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .run(randomUUID(), winner.id, id, loser.id, "win", result.method, winner.elo, winnerNewElo);
          db.prepare("INSERT INTO fighter_history (id, fighter_id, fight_id, opponent_id, result, method, elo_before, elo_after) VALUES (?, ?, ?, ?, ?, ?, ?, ?)")
            .run(randomUUID(), loser.id, id, winner.id, "loss", result.method, loser.elo, loserNewElo);
        }

        // Settle every prediction market using the same deterministic result.
        const markets = db.prepare("SELECT * FROM markets WHERE fight_id = ? AND status = 'open'").all(id) as Record<string, unknown>[];
        for (const market of markets) {
          let marketResult: string | null = null;
          switch (market.type as string) {
            case "winner": marketResult = result.winner === "A" ? a.name : result.winner === "B" ? b.name : "Draw"; break;
            case "method": marketResult = result.method === "SUB" ? "Submission" : result.method === "KO" || result.method === "TKO" ? "KO/TKO" : "Decision"; break;
            case "round": marketResult = result.method === "DEC" || result.method === "DRAW" ? "Goes the distance" : `Round ${result.totalRounds}`; break;
            case "over_under": marketResult = result.totalRounds > 1 ? "Over 1.5" : "Under 1.5"; break;
            case "method_round": marketResult = `${result.method} Round ${result.totalRounds}`; break;
            case "goes_distance": marketResult = result.method === "DEC" || result.method === "DRAW" ? "Yes" : "No"; break;
          }
          if (!marketResult) continue;
          db.prepare("UPDATE markets SET status = 'resolved', result = ? WHERE id = ?").run(marketResult, market.id as string);
          const marketBets = db.prepare("SELECT * FROM market_bets WHERE market_id = ?").all(market.id as string) as { id: string; selection: string; amount: number; odds: number }[];
          for (const marketBet of marketBets) {
            const won = marketBet.selection === marketResult;
            db.prepare("UPDATE market_bets SET status = ?, payout = ? WHERE id = ?")
              .run(won ? "won" : "lost", won ? marketBet.amount * marketBet.odds : 0, marketBet.id);
          }
        }

        send({ type: "stream_end" });
        try { controller.close(); } catch {}
      }, lastDelay + 2000);
      timers.push(finalTimer);

      // Cleanup on abort
      _req.signal.addEventListener("abort", () => {
        closed = true;
        timers.forEach(t => clearTimeout(t));
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}

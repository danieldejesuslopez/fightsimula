/**
 * Fight Simulation Engine — Provably Fair
 *
 * Uses a seeded PRNG (server_seed + client_seed + nonce) so the result
 * is deterministic and verifiable after the seeds are revealed.
 */
import { createHash, createHmac } from "crypto";

// ---------- PRNG ----------
function hmacSha256(key: string, message: string): Buffer {
  return createHmac("sha256", key).update(message).digest();
}

/** Provably fair float [0, 1) from seeds */
function prngFloat(serverSeed: string, clientSeed: string, nonce: number, cursor: number): number {
  const hash = hmacSha256(serverSeed, `${clientSeed}:${nonce}:${cursor}`);
  // Use first 4 bytes → uint32 → float
  const uint32 = hash.readUInt32BE(0);
  return uint32 / 0x100000000;
}

class SeededRNG {
  private cursor = 0;
  constructor(
    private serverSeed: string,
    private clientSeed: string,
    private nonce: number
  ) {}

  /** Returns [0, 1) */
  next(): number {
    return prngFloat(this.serverSeed, this.clientSeed, this.nonce, this.cursor++);
  }

  /** Returns int in [min, max] inclusive */
  int(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  /** Weighted pick: items with weight */
  pick<T>(items: { value: T; weight: number }[]): T {
    const total = items.reduce((s, i) => s + i.weight, 0);
    let r = this.next() * total;
    for (const item of items) {
      r -= item.weight;
      if (r <= 0) return item.value;
    }
    return items[items.length - 1].value;
  }
}

// ---------- Hash ----------
export function hashSeed(seed: string): string {
  return createHash("sha256").update(seed).digest("hex");
}

// ---------- Fighter type ----------
export interface FighterStats {
  id: string;
  name: string;
  striking: number;
  grappling: number;
  cardio: number;
  chin: number;
  speed: number;
  style: string;
  elo: number;
}

// ---------- Round result ----------
export interface RoundResult {
  round: number;
  scoreA: number;
  scoreB: number;
  events: string[];
  finish?: { winner: "A" | "B"; method: "KO" | "TKO" | "SUB" };
}

export interface FightResult {
  rounds: RoundResult[];
  winner: "A" | "B" | "DRAW";
  method: "KO" | "TKO" | "SUB" | "DEC" | "DRAW";
  totalRounds: number;
}

// ---------- Simulate ----------
export function simulateFight(
  fighterA: FighterStats,
  fighterB: FighterStats,
  maxRounds: number,
  serverSeed: string,
  clientSeed: string,
  nonce: number
): FightResult {
  const rng = new SeededRNG(serverSeed, clientSeed, nonce);
  const rounds: RoundResult[] = [];

  let hpA = 100;
  let hpB = 100;
  let staminaA = fighterA.cardio;
  let staminaB = fighterB.cardio;

  for (let r = 1; r <= maxRounds; r++) {
    const events: string[] = [];
    let scoreA = 10;
    let scoreB = 10;

    // Fatigue
    const fatigueA = Math.max(0.5, staminaA / 100);
    const fatigueB = Math.max(0.5, staminaB / 100);

    // Striking exchanges (3-6 per round)
    const exchanges = rng.int(3, 6);
    for (let e = 0; e < exchanges; e++) {
      const atkA = fighterA.striking * fatigueA + rng.int(-10, 10);
      const atkB = fighterB.striking * fatigueB + rng.int(-10, 10);

      if (atkA > atkB) {
        const dmg = rng.int(3, 8) * (atkA / 80);
        hpB -= dmg;
        scoreA += 1;
        events.push(`${fighterA.name} lands a ${dmg > 6 ? "heavy" : "clean"} strike`);

        // KO check
        if (hpB <= 0) {
          rounds.push({ round: r, scoreA, scoreB, events, finish: { winner: "A", method: rng.next() > 0.5 ? "KO" : "TKO" } });
          return { rounds, winner: "A", method: rounds[rounds.length - 1].finish!.method, totalRounds: r };
        }
      } else {
        const dmg = rng.int(3, 8) * (atkB / 80);
        hpA -= dmg;
        scoreB += 1;
        events.push(`${fighterB.name} lands a ${dmg > 6 ? "heavy" : "clean"} strike`);

        if (hpA <= 0) {
          rounds.push({ round: r, scoreA, scoreB, events, finish: { winner: "B", method: rng.next() > 0.5 ? "KO" : "TKO" } });
          return { rounds, winner: "B", method: rounds[rounds.length - 1].finish!.method, totalRounds: r };
        }
      }
    }

    // Grappling attempt
    if (rng.next() < 0.4) {
      const grapA = fighterA.grappling * fatigueA + rng.int(-10, 10);
      const grapB = fighterB.grappling * fatigueB + rng.int(-10, 10);

      if (grapA > grapB + 15) {
        events.push(`${fighterA.name} secures a takedown`);
        scoreA += 2;

        // Submission attempt
        if (rng.next() < 0.2 && fighterA.grappling > 60) {
          rounds.push({ round: r, scoreA, scoreB, events, finish: { winner: "A", method: "SUB" } });
          return { rounds, winner: "A", method: "SUB", totalRounds: r };
        }
      } else if (grapB > grapA + 15) {
        events.push(`${fighterB.name} secures a takedown`);
        scoreB += 2;

        if (rng.next() < 0.2 && fighterB.grappling > 60) {
          rounds.push({ round: r, scoreA, scoreB, events, finish: { winner: "B", method: "SUB" } });
          return { rounds, winner: "B", method: "SUB", totalRounds: r };
        }
      } else {
        events.push("Clinch battle, no takedown");
      }
    }

    staminaA -= rng.int(5, 12);
    staminaB -= rng.int(5, 12);

    rounds.push({ round: r, scoreA, scoreB, events });
  }

  // Decision
  const totalA = rounds.reduce((s, r) => s + r.scoreA, 0);
  const totalB = rounds.reduce((s, r) => s + r.scoreB, 0);

  const winner = totalA > totalB ? "A" : totalB > totalA ? "B" : "DRAW";
  return { rounds, winner, method: winner === "DRAW" ? "DRAW" : "DEC", totalRounds: maxRounds };
}

// ---------- Odds calc ----------
export function calculateOdds(a: FighterStats, b: FighterStats): { oddsA: number; oddsB: number } {
  const powerA = a.striking * 0.3 + a.grappling * 0.25 + a.cardio * 0.15 + a.chin * 0.15 + a.speed * 0.15;
  const powerB = b.striking * 0.3 + b.grappling * 0.25 + b.cardio * 0.15 + b.chin * 0.15 + b.speed * 0.15;

  const probA = powerA / (powerA + powerB);
  const probB = 1 - probA;

  // Add 5% house margin
  const margin = 1.05;
  return {
    oddsA: parseFloat((margin / probA).toFixed(2)),
    oddsB: parseFloat((margin / probB).toFixed(2)),
  };
}

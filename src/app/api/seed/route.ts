import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import { randomUUID, randomBytes, createHash } from "crypto";

export async function POST() {
  const db = getDb();

  // Check if already seeded
  const existing = db.prepare("SELECT COUNT(*) as count FROM fighters").get() as { count: number };
  if (existing.count > 0) {
    return NextResponse.json({ message: "Already seeded", fighters: existing.count });
  }

  const fighters = [
    { name: "Iron Mike", nickname: "The Beast", weight: 93, height: 178, reach: 180, style: "striker", rating: 88, striking: 92, grappling: 45, cardio: 75, chin: 85, speed: 82, elo: 1650, wins: 12, losses: 2, ko_wins: 8, sub_wins: 0, dec_wins: 4, streak: 5 },
    { name: "Khabib Eagle", nickname: "The Eagle", weight: 77, height: 178, reach: 178, style: "grappler", rating: 90, striking: 65, grappling: 95, cardio: 90, chin: 88, speed: 70, elo: 1700, wins: 15, losses: 0, ko_wins: 2, sub_wins: 8, dec_wins: 5, streak: 15 },
    { name: "Lightning Lee", nickname: "Flash", weight: 84, height: 185, reach: 193, style: "striker", rating: 85, striking: 88, grappling: 50, cardio: 80, chin: 72, speed: 95, elo: 1580, wins: 10, losses: 3, ko_wins: 7, sub_wins: 0, dec_wins: 3, streak: 2 },
    { name: "Ground Zero", nickname: "GZ", weight: 84, height: 175, reach: 175, style: "grappler", rating: 82, striking: 55, grappling: 90, cardio: 85, chin: 80, speed: 65, elo: 1540, wins: 9, losses: 4, ko_wins: 1, sub_wins: 6, dec_wins: 2, streak: -1 },
    { name: "El Diablo", nickname: "Diablo", weight: 77, height: 180, reach: 185, style: "balanced", rating: 86, striking: 78, grappling: 78, cardio: 88, chin: 82, speed: 80, elo: 1600, wins: 11, losses: 2, ko_wins: 4, sub_wins: 3, dec_wins: 4, streak: 3 },
    { name: "Titan Thor", nickname: "The Hammer", weight: 105, height: 193, reach: 200, style: "striker", rating: 84, striking: 90, grappling: 40, cardio: 60, chin: 90, speed: 55, elo: 1520, wins: 8, losses: 5, ko_wins: 7, sub_wins: 0, dec_wins: 1, streak: -2 },
    { name: "Shadow Fury", nickname: "The Shadow", weight: 77, height: 175, reach: 178, style: "balanced", rating: 83, striking: 80, grappling: 75, cardio: 82, chin: 78, speed: 88, elo: 1560, wins: 9, losses: 3, ko_wins: 3, sub_wins: 2, dec_wins: 4, streak: 1 },
    { name: "Dragon Fist", nickname: "The Dragon", weight: 84, height: 180, reach: 183, style: "striker", rating: 87, striking: 91, grappling: 48, cardio: 78, chin: 75, speed: 90, elo: 1620, wins: 13, losses: 2, ko_wins: 10, sub_wins: 0, dec_wins: 3, streak: 4 },
    { name: "The Reaper", nickname: "Death", weight: 93, height: 188, reach: 195, style: "balanced", rating: 89, striking: 85, grappling: 82, cardio: 76, chin: 88, speed: 72, elo: 1680, wins: 14, losses: 1, ko_wins: 6, sub_wins: 5, dec_wins: 3, streak: 8 },
    { name: "Ice Queen", nickname: "Frost", weight: 61, height: 170, reach: 170, style: "striker", rating: 84, striking: 86, grappling: 60, cardio: 90, chin: 70, speed: 92, elo: 1570, wins: 10, losses: 2, ko_wins: 5, sub_wins: 1, dec_wins: 4, streak: 3 },
    { name: "Bone Crusher", nickname: "Bones", weight: 105, height: 195, reach: 203, style: "grappler", rating: 86, striking: 70, grappling: 92, cardio: 65, chin: 92, speed: 50, elo: 1610, wins: 11, losses: 3, ko_wins: 3, sub_wins: 6, dec_wins: 2, streak: 2 },
    { name: "Phantom Strike", nickname: "Ghost", weight: 70, height: 173, reach: 175, style: "striker", rating: 81, striking: 84, grappling: 55, cardio: 85, chin: 68, speed: 93, elo: 1500, wins: 7, losses: 4, ko_wins: 5, sub_wins: 0, dec_wins: 2, streak: -1 },
  ];

  const insertFighter = db.prepare(`
    INSERT INTO fighters (id, name, nickname, weight, height, reach, style, rating, striking, grappling, cardio, chin, speed, elo, wins, losses, ko_wins, sub_wins, dec_wins, streak)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const fighterIds: Record<string, string> = {};
  const createdFighters: Array<{ id: string; name: string }> = [];

  const insertAll = db.transaction(() => {
    for (const f of fighters) {
      const id = randomUUID();
      insertFighter.run(id, f.name, f.nickname, f.weight, f.height, f.reach, f.style, f.rating, f.striking, f.grappling, f.cardio, f.chin, f.speed, f.elo, f.wins, f.losses, f.ko_wins, f.sub_wins, f.dec_wins, f.streak);
      fighterIds[f.name] = id;
      createdFighters.push({ id, name: f.name });
    }

    // Create the event
    const eventId = randomUUID();
    const scheduledAt = "2026-09-12T20:00:00Z";
    db.prepare(`INSERT INTO events (id, name, tagline, status, scheduled_at) VALUES (?, ?, ?, ?, ?)`)
      .run(eventId, "ALLFIGHTS 01 — FRIDAY NIGHT", "The Inaugural Card", "upcoming", scheduledAt);

    // Define fight matchups: [fighterA, fighterB, rounds, isMainEvent, isCoMain]
    const matchups: [string, string, number, number, number][] = [
      // Main card
      ["Iron Mike", "Khabib Eagle", 5, 1, 0],
      ["The Reaper", "Dragon Fist", 3, 0, 1],
      ["Lightning Lee", "El Diablo", 3, 0, 0],
      // Prelims
      ["Titan Thor", "Bone Crusher", 3, 0, 0],
      ["Shadow Fury", "Phantom Strike", 3, 0, 0],
      ["Ice Queen", "Ground Zero", 3, 0, 0],
    ];

    const insertFight = db.prepare(`
      INSERT INTO fights (id, status, scheduled_at, fighter_a_id, fighter_b_id, rounds, server_seed, seed_hash, odds_a, odds_b, event_id)
      VALUES (?, 'upcoming', ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertEventFight = db.prepare(`INSERT INTO event_fights (event_id, fight_id, fight_order, is_main_event, is_co_main) VALUES (?, ?, ?, ?, ?)`);
    const insertMarket = db.prepare(`INSERT INTO markets (id, fight_id, type, question, options) VALUES (?, ?, ?, ?, ?)`);
    const insertOddsHistory = db.prepare(`INSERT INTO odds_history (fight_id, odds_a, odds_b, pool_a, pool_b, total_bets) VALUES (?, ?, ?, ?, ?, ?)`);
    const insertBet = db.prepare(`INSERT INTO bets (id, fight_id, wallet, amount, side, odds, status) VALUES (?, ?, ?, ?, ?, ?, 'pending')`);

    const fightOdds: [number, number][] = [
      [1.75, 2.15],  // Mike vs Khabib
      [1.90, 1.95],  // Reaper vs Dragon
      [2.10, 1.78],  // Lee vs Diablo
      [2.40, 1.58],  // Thor vs Bone Crusher
      [1.65, 2.30],  // Shadow vs Phantom
      [1.85, 2.00],  // Ice Queen vs GZ
    ];

    const fightIds: string[] = [];

    for (let i = 0; i < matchups.length; i++) {
      const [nameA, nameB, rounds, isMain, isCoMain] = matchups[i];
      const fightId = randomUUID();
      fightIds.push(fightId);
      const serverSeed = randomBytes(32).toString("hex");
      const seedHash = createHash("sha256").update(serverSeed).digest("hex");
      const [oddsA, oddsB] = fightOdds[i];

      insertFight.run(fightId, scheduledAt, fighterIds[nameA], fighterIds[nameB], rounds, serverSeed, seedHash, oddsA, oddsB, eventId);
      insertEventFight.run(eventId, fightId, i + 1, isMain, isCoMain);

      // Markets for each fight
      insertMarket.run(randomUUID(), fightId, "winner", "Who will win?", JSON.stringify([nameA, nameB]));
      insertMarket.run(randomUUID(), fightId, "method", "Method of Victory?", JSON.stringify(["KO/TKO", "Submission", "Decision"]));
      insertMarket.run(randomUUID(), fightId, "round", "What round will it end?", JSON.stringify(["Round 1", "Round 2", "Round 3", ...(rounds === 5 ? ["Round 4", "Round 5"] : []), "Goes the distance"]));
      insertMarket.run(randomUUID(), fightId, "over_under", "Over/Under 1.5 rounds?", JSON.stringify(["Over 1.5", "Under 1.5"]));

      // Fake odds history (3 snapshots per fight)
      const baseA = oddsA;
      const baseB = oddsB;
      insertOddsHistory.run(fightId, baseA + 0.2, baseB - 0.1, 500, 300, 8);
      insertOddsHistory.run(fightId, baseA + 0.1, baseB - 0.05, 1200, 800, 20);
      insertOddsHistory.run(fightId, baseA, baseB, 2500, 1800, 42);

      // Fake bets (2 per fight)
      const fakeWallets = ["0xABC123", "0xDEF456", "0x789GHI", "0xJKL012"];
      insertBet.run(randomUUID(), fightId, fakeWallets[i % 4], 50 + i * 10, "A", oddsA);
      insertBet.run(randomUUID(), fightId, fakeWallets[(i + 1) % 4], 30 + i * 15, "B", oddsB);
    }
  });

  insertAll();

  // Seed achievements, season, standings, and user_achievements
  const seedExtras = db.transaction(() => {
    const insertAchievement = db.prepare(`INSERT OR IGNORE INTO achievements (id, name, description, icon, category, requirement_type, requirement_value, rarity, xp) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    const achievements = [
      ["ach_first_blood", "First Blood", "Place your first bet", "🩸", "betting", "bets_placed", 1, "common", 10],
      ["ach_high_roller", "High Roller", "Wager over $1000 total", "💰", "betting", "total_wagered", 1000, "rare", 50],
      ["ach_sharp_shooter", "Sharp Shooter", "Win 10 bets", "🎯", "betting", "bets_won", 10, "uncommon", 30],
      ["ach_whale", "Whale", "Place a single bet over $500", "🐋", "betting", "single_bet", 500, "epic", 100],
      ["ach_oracle", "Oracle", "Win 5 bets in a row", "🔮", "streak", "win_streak", 5, "legendary", 200],
      ["ach_degen", "Degen", "Place 50 bets", "🎰", "betting", "bets_placed", 50, "uncommon", 40],
      ["ach_diamond_hands", "Diamond Hands", "Hold through 3 losing bets", "💎", "resilience", "loss_streak", 3, "rare", 60],
      ["ach_method_master", "Method Master", "Correctly predict method of victory 5 times", "🧠", "prediction", "method_correct", 5, "epic", 80],
      ["ach_fight_night", "Fight Night Regular", "Bet on every fight in an event", "🏟️", "events", "event_complete", 1, "rare", 50],
      ["ach_underdog", "Underdog Hunter", "Win a bet at 3.0+ odds", "🐕", "betting", "underdog_win", 1, "uncommon", 35],
    ];
    for (const a of achievements) {
      insertAchievement.run(...a);
    }

    // Seed season
    const seasonId = "season_1";
    db.prepare(`INSERT OR IGNORE INTO seasons (id, name, number, status, start_date, end_date, prize_pool) VALUES (?, ?, ?, ?, ?, ?, ?)`)
      .run(seasonId, "Genesis Season", 1, "active", "2026-09-01", "2026-12-01", 10000);

    // Seed season standings for demo wallets
    const insertStanding = db.prepare(`INSERT OR IGNORE INTO season_standings (season_id, wallet, points, bets_won, bets_total, profit, rank) VALUES (?, ?, ?, ?, ?, ?, ?)`);
    insertStanding.run(seasonId, "0xABC123", 450, 8, 14, 320.50, 1);
    insertStanding.run(seasonId, "0xDEF456", 380, 6, 12, 185.00, 2);
    insertStanding.run(seasonId, "0x789GHI", 290, 5, 15, -45.00, 3);
    insertStanding.run(seasonId, "0xJKL012", 210, 3, 10, -120.00, 4);

    // Seed user achievements for demo wallets
    const insertUA = db.prepare(`INSERT OR IGNORE INTO user_achievements (wallet, achievement_id, unlocked_at) VALUES (?, ?, datetime('now'))`);
    insertUA.run("0xABC123", "ach_first_blood");
    insertUA.run("0xABC123", "ach_sharp_shooter");
    insertUA.run("0xABC123", "ach_high_roller");
    insertUA.run("0xDEF456", "ach_first_blood");
    insertUA.run("0xDEF456", "ach_degen");
    insertUA.run("0x789GHI", "ach_first_blood");
    insertUA.run("0x789GHI", "ach_diamond_hands");
  });
  seedExtras();

  return NextResponse.json({ created: createdFighters.length, fighters: createdFighters, event: "ALLFIGHTS 01 — FRIDAY NIGHT" });
}

import Database from "better-sqlite3";
import path from "path";

const dbPath = path.join(process.cwd(), "fightsim.db");

let _db: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!_db) {
    _db = new Database(dbPath);
    _db.pragma("journal_mode = WAL");
    _db.pragma("foreign_keys = ON");
    initDb(_db);
  }
  return _db;
}

function initDb(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS fighters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nickname TEXT,
      weight REAL NOT NULL,
      height REAL NOT NULL,
      reach REAL NOT NULL,
      style TEXT NOT NULL,
      avatar TEXT,
      rating INTEGER DEFAULT 50,
      striking INTEGER DEFAULT 50,
      grappling INTEGER DEFAULT 50,
      cardio INTEGER DEFAULT 50,
      chin INTEGER DEFAULT 50,
      speed INTEGER DEFAULT 50,
      elo INTEGER DEFAULT 1500,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS fights (
      id TEXT PRIMARY KEY,
      status TEXT DEFAULT 'upcoming',
      scheduled_at TEXT NOT NULL,
      started_at TEXT,
      ended_at TEXT,
      fighter_a_id TEXT NOT NULL REFERENCES fighters(id),
      fighter_b_id TEXT NOT NULL REFERENCES fighters(id),
      rounds INTEGER DEFAULT 3,
      winner_id TEXT,
      method TEXT,
      server_seed TEXT NOT NULL,
      client_seed TEXT,
      nonce INTEGER DEFAULT 0,
      seed_hash TEXT NOT NULL,
      odds_a REAL DEFAULT 2.0,
      odds_b REAL DEFAULT 2.0,
      sim_log TEXT,
      video_url TEXT,
      video_status TEXT DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS bets (
      id TEXT PRIMARY KEY,
      fight_id TEXT NOT NULL REFERENCES fights(id),
      wallet TEXT NOT NULL,
      amount REAL NOT NULL,
      side TEXT NOT NULL,
      odds REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payout REAL,
      tx_hash TEXT,
      payout_tx TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS users (
      wallet TEXT PRIMARY KEY,
      username TEXT,
      avatar TEXT,
      balance REAL DEFAULT 0,
      total_wagered REAL DEFAULT 0,
      total_won REAL DEFAULT 0,
      total_bets INTEGER DEFAULT 0,
      wins INTEGER DEFAULT 0,
      losses INTEGER DEFAULT 0,
      nonce TEXT,
      created_at TEXT DEFAULT (datetime('now')),
      last_seen TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      message TEXT NOT NULL,
      fight_id TEXT,
      read INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS odds_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fight_id TEXT NOT NULL REFERENCES fights(id),
      odds_a REAL NOT NULL,
      odds_b REAL NOT NULL,
      pool_a REAL DEFAULT 0,
      pool_b REAL DEFAULT 0,
      total_bets INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS events (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      status TEXT DEFAULT 'upcoming',
      scheduled_at TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS event_fights (
      event_id TEXT NOT NULL REFERENCES events(id),
      fight_id TEXT NOT NULL REFERENCES fights(id),
      fight_order INTEGER NOT NULL,
      is_main_event INTEGER DEFAULT 0,
      is_co_main INTEGER DEFAULT 0,
      PRIMARY KEY (event_id, fight_id)
    );

    CREATE TABLE IF NOT EXISTS markets (
      id TEXT PRIMARY KEY,
      fight_id TEXT NOT NULL REFERENCES fights(id),
      type TEXT NOT NULL,
      question TEXT NOT NULL,
      options TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      result TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS market_bets (
      id TEXT PRIMARY KEY,
      market_id TEXT NOT NULL REFERENCES markets(id),
      wallet TEXT NOT NULL,
      amount REAL NOT NULL,
      selection TEXT NOT NULL,
      odds REAL NOT NULL,
      status TEXT DEFAULT 'pending',
      payout REAL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS seasons (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      number INTEGER NOT NULL,
      status TEXT DEFAULT 'upcoming',
      start_date TEXT NOT NULL,
      end_date TEXT NOT NULL,
      prize_pool REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS season_standings (
      season_id TEXT NOT NULL REFERENCES seasons(id),
      wallet TEXT NOT NULL,
      points INTEGER DEFAULT 0,
      bets_won INTEGER DEFAULT 0,
      bets_total INTEGER DEFAULT 0,
      profit REAL DEFAULT 0,
      rank INTEGER DEFAULT 0,
      PRIMARY KEY (season_id, wallet)
    );

    CREATE TABLE IF NOT EXISTS achievements (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      icon TEXT NOT NULL,
      category TEXT NOT NULL,
      requirement_type TEXT NOT NULL,
      requirement_value INTEGER NOT NULL,
      rarity TEXT DEFAULT 'common',
      xp INTEGER DEFAULT 10
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      wallet TEXT NOT NULL,
      achievement_id TEXT NOT NULL REFERENCES achievements(id),
      unlocked_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (wallet, achievement_id)
    );

    CREATE TABLE IF NOT EXISTS social_posts (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      type TEXT NOT NULL,
      content TEXT NOT NULL,
      fight_id TEXT,
      bet_id TEXT,
      likes INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS social_likes (
      post_id TEXT NOT NULL REFERENCES social_posts(id),
      wallet TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      PRIMARY KEY (post_id, wallet)
    );

    CREATE TABLE IF NOT EXISTS fighter_history (
      id TEXT PRIMARY KEY,
      fighter_id TEXT NOT NULL REFERENCES fighters(id),
      fight_id TEXT NOT NULL REFERENCES fights(id),
      opponent_id TEXT NOT NULL REFERENCES fighters(id),
      result TEXT NOT NULL,
      method TEXT,
      elo_before INTEGER,
      elo_after INTEGER,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS predictions (
      id TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      fight_id TEXT NOT NULL REFERENCES fights(id),
      predicted_winner TEXT NOT NULL,
      predicted_method TEXT,
      predicted_round INTEGER,
      confidence REAL,
      ai_analysis TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS copy_trading (
      id TEXT PRIMARY KEY,
      follower_wallet TEXT NOT NULL,
      leader_wallet TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      max_bet REAL DEFAULT 100,
      multiplier REAL DEFAULT 1.0,
      total_copied REAL DEFAULT 0,
      profit REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referrals (
      id TEXT PRIMARY KEY,
      referrer_wallet TEXT NOT NULL,
      referee_wallet TEXT NOT NULL,
      code TEXT NOT NULL,
      status TEXT DEFAULT 'active',
      total_earned REAL DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS referral_codes (
      code TEXT PRIMARY KEY,
      wallet TEXT NOT NULL,
      uses INTEGER DEFAULT 0,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS gambling_limits (
      wallet TEXT PRIMARY KEY,
      daily_deposit REAL DEFAULT 500,
      daily_loss REAL DEFAULT 250,
      max_bet REAL DEFAULT 250,
      session_limit TEXT DEFAULT 'unlimited',
      cooldown TEXT DEFAULT 'none',
      self_exclusion_until TEXT,
      updated_at TEXT DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS integrity_alerts (
      id TEXT PRIMARY KEY,
      wallet TEXT,
      fight_id TEXT REFERENCES fights(id),
      severity TEXT NOT NULL,
      type TEXT NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'open',
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_odds_history_fight ON odds_history(fight_id);
    CREATE INDEX IF NOT EXISTS idx_bets_fight ON bets(fight_id);
    CREATE INDEX IF NOT EXISTS idx_market_bets_market ON market_bets(market_id);
    CREATE INDEX IF NOT EXISTS idx_events_status ON events(status);
    CREATE INDEX IF NOT EXISTS idx_social_posts_wallet ON social_posts(wallet);
    CREATE INDEX IF NOT EXISTS idx_fighter_history_fighter ON fighter_history(fighter_id);
    CREATE INDEX IF NOT EXISTS idx_predictions_fight ON predictions(fight_id);
    CREATE INDEX IF NOT EXISTS idx_copy_trading_leader ON copy_trading(leader_wallet);
    CREATE INDEX IF NOT EXISTS idx_referrals_referrer ON referrals(referrer_wallet);
    CREATE INDEX IF NOT EXISTS idx_integrity_alerts_fight ON integrity_alerts(fight_id);
    CREATE INDEX IF NOT EXISTS idx_integrity_alerts_wallet ON integrity_alerts(wallet);
  `);

  // Add columns if missing (idempotent)
  try { db.exec("ALTER TABLE fighters ADD COLUMN elo INTEGER DEFAULT 1500"); } catch {}
  try { db.exec("ALTER TABLE fighters ADD COLUMN wins INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE fighters ADD COLUMN losses INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE fighters ADD COLUMN ko_wins INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE fighters ADD COLUMN sub_wins INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE fighters ADD COLUMN dec_wins INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE fighters ADD COLUMN streak INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE fights ADD COLUMN event_id TEXT"); } catch {}
  try { db.exec("ALTER TABLE fights ADD COLUMN video_job_id TEXT"); } catch {}
  try { db.exec("ALTER TABLE fights ADD COLUMN video_error TEXT"); } catch {}

  db.exec(`
    CREATE TABLE IF NOT EXISTS fight_chat_messages (
      id TEXT PRIMARY KEY,
      fight_id TEXT NOT NULL REFERENCES fights(id),
      wallet TEXT NOT NULL,
      username TEXT,
      message TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_fight_chat_fight ON fight_chat_messages(fight_id, id);

    CREATE TABLE IF NOT EXISTS chain_ledger (
      id TEXT PRIMARY KEY,
      block_number INTEGER NOT NULL,
      tx_hash TEXT NOT NULL,
      event_type TEXT NOT NULL,
      wallet TEXT,
      fight_id TEXT REFERENCES fights(id),
      bet_id TEXT,
      amount REAL,
      confirmations INTEGER DEFAULT 1,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_chain_ledger_fight ON chain_ledger(fight_id);
    CREATE INDEX IF NOT EXISTS idx_chain_ledger_wallet ON chain_ledger(wallet);
  `);
}

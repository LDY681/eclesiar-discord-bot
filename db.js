const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./bot.db', (err) => {
  if (err) {
    console.error('[DB] Error opening database:', err.message);
  } else {
    console.log('[DB] Connected to SQLite database.');
    db.run(`
      CREATE TABLE IF NOT EXISTS war_subscriptions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        warId INTEGER NOT NULL,
        channelId TEXT NOT NULL,
        guildId TEXT NOT NULL,
        favoredSide TEXT NOT NULL,
        role TEXT NULL,
        level TEXT NULL,
        roundId INTEGER NULL,
        UNIQUE(warId, channelId, favoredSide)
      )
    `);
    db.run(`
      CREATE TABLE IF NOT EXISTS war_details (
        warId INTEGER PRIMARY KEY,
        attackerName TEXT NOT NULL,
        defenderName TEXT NOT NULL,
        regionName TEXT NOT NULL
      )
    `);
  }
});

module.exports = db;

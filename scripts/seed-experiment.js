const Database = require('better-sqlite3');
const db = new Database('data.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    systemPrompt TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

db.prepare('INSERT INTO experiments (name, systemPrompt) VALUES (?, ?)')
  .run('Test Experiment', 'This is a test system prompt.');

console.log('Inserted test experiment into SQLite database.'); 
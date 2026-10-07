import Database from 'better-sqlite3';

const db = new Database('mydatabase.db');

db.exec(`
  CREATE TABLE IF NOT EXISTS experiments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    systemPrompt TEXT NOT NULL,
    created_at TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export default db; 
import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const DB_PATH = process.env.DB_PATH || path.join(dataDir, 'modigitalevents.db');

const db = new Database(DB_PATH);

// Enable WAL mode for better concurrent read performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Initialize all tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT DEFAULT 'guest' CHECK(role IN ('admin', 'guest')),
    assigned_event_ids TEXT DEFAULT '[]',
    scanner_enabled INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS events (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT DEFAULT '',
    location TEXT DEFAULT '',
    is_multi_day INTEGER DEFAULT 0,
    start_date TEXT NOT NULL,
    end_date TEXT,
    invited_guests INTEGER DEFAULT 0,
    created_by TEXT NOT NULL,
    activities TEXT DEFAULT '[]',
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS qr_codes (
    id TEXT PRIMARY KEY,
    code TEXT NOT NULL,
    qr_hash TEXT,
    name TEXT,
    type TEXT NOT NULL DEFAULT 'S' CHECK(type IN ('S', 'D', 'M')),
    event_id TEXT NOT NULL,
    max_admissions INTEGER NOT NULL DEFAULT 1,
    guest_name TEXT,
    phone_number TEXT,
    bulk_upload_id TEXT,
    is_valid INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_qr_codes_event ON qr_codes(event_id);
  CREATE INDEX IF NOT EXISTS idx_qr_codes_code_event ON qr_codes(code, event_id);
  CREATE INDEX IF NOT EXISTS idx_qr_codes_hash ON qr_codes(qr_hash);

  CREATE TABLE IF NOT EXISTS qr_bulk_uploads (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    file_name TEXT NOT NULL,
    total_codes INTEGER NOT NULL,
    uploaded_by TEXT NOT NULL,
    uploaded_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS scans (
    id TEXT PRIMARY KEY,
    qr_code_id TEXT NOT NULL,
    qr_code TEXT NOT NULL,
    event_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    scanned_by TEXT NOT NULL,
    scanned_at TEXT DEFAULT (datetime('now')),
    admission_count INTEGER NOT NULL DEFAULT 1,
    notes TEXT,
    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_scans_qr_activity ON scans(qr_code_id, activity_id);
  CREATE INDEX IF NOT EXISTS idx_scans_event ON scans(event_id);
  CREATE INDEX IF NOT EXISTS idx_scans_at ON scans(scanned_at);

  CREATE TABLE IF NOT EXISTS rejected_scans (
    id TEXT PRIMARY KEY,
    qr_code_id TEXT,
    qr_code TEXT NOT NULL,
    event_id TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    scanned_by TEXT NOT NULL,
    scanned_at TEXT DEFAULT (datetime('now')),
    attempted_admission_count INTEGER DEFAULT 1,
    reason TEXT NOT NULL,
    notes TEXT
  );

  CREATE TABLE IF NOT EXISTS archived_reports (
    id TEXT PRIMARY KEY,
    event_id TEXT NOT NULL,
    event_name TEXT NOT NULL,
    activity_id TEXT NOT NULL,
    activity_name TEXT NOT NULL,
    data TEXT NOT NULL,
    archived_at TEXT DEFAULT (datetime('now')),
    archived_by TEXT NOT NULL
  );
`);

// Seed default admin user if no users exist
const userCount = (db.prepare('SELECT COUNT(*) as cnt FROM users').get() as { cnt: number }).cnt;
if (userCount === 0) {
  db.prepare(`
    INSERT INTO users (id, name, email, password, role, assigned_event_ids, scanner_enabled)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run('admin-001', 'Admin', 'admin@modigitalevents.com', 'Admin@123', 'admin', '[]', 1);
}

export { db };
export default db;

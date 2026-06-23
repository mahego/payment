import * as SQLite from 'expo-sqlite';

let _db: SQLite.SQLiteDatabase | null = null;

export async function getDb(): Promise<SQLite.SQLiteDatabase> {
  if (_db) return _db;
  _db = await SQLite.openDatabaseAsync('deluxnet.db');
  await runMigrations(_db);
  return _db;
}

async function runMigrations(db: SQLite.SQLiteDatabase) {
  await db.execAsync(`
    PRAGMA journal_mode = WAL;
    PRAGMA foreign_keys = ON;

    -- Auth / session metadata (offline user context)
    CREATE TABLE IF NOT EXISTS auth_meta (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    -- Cached customers (synced from server)
    CREATE TABLE IF NOT EXISTS customers (
      id               TEXT PRIMARY KEY,
      first_name       TEXT NOT NULL,
      last_name        TEXT NOT NULL,
      phone            TEXT,
      email            TEXT,
      address_line     TEXT,
      status           TEXT NOT NULL DEFAULT 'ACTIVO',
      current_balance  REAL NOT NULL DEFAULT 0,
      synced_at        INTEGER NOT NULL
    );

    -- Outbox events (offline operations)
    CREATE TABLE IF NOT EXISTS outbox_events (
      id               TEXT PRIMARY KEY,
      device_id        TEXT NOT NULL,
      user_id          TEXT NOT NULL,
      aggregate_type   TEXT NOT NULL,
      aggregate_id     TEXT NOT NULL,
      operation        TEXT NOT NULL,
      client_request_id TEXT NOT NULL UNIQUE,
      payload          TEXT NOT NULL,
      status           TEXT NOT NULL DEFAULT 'pending',
      error_message    TEXT,
      attempts         INTEGER NOT NULL DEFAULT 0,
      occurred_at      INTEGER NOT NULL,
      synced_at        INTEGER
    );

    -- Sync metadata
    CREATE TABLE IF NOT EXISTS sync_metadata (
      entity    TEXT PRIMARY KEY,
      last_sync INTEGER
    );
  `);
}

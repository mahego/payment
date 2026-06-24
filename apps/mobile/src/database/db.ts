import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';

const isWeb = Platform.OS === 'web';

class WebSQLiteMock {
  private memoryStore = {
    customers: [
      {
        id: 'cust-1',
        first_name: 'Juan',
        last_name: 'Pérez',
        phone: '555-0192',
        email: 'juan@gmail.com',
        address_line: 'Calle Falsa 123',
        status: 'ACTIVO',
        current_balance: 1500.00,
        is_network_suspended: 0,
        synced_at: Date.now(),
      },
      {
        id: 'cust-2',
        first_name: 'María',
        last_name: 'López',
        phone: '555-0143',
        email: 'maria@gmail.com',
        address_line: 'Av. Siempre Viva 742',
        status: 'MOROSO',
        current_balance: 450.00,
        is_network_suspended: 0,
        synced_at: Date.now(),
      },
      {
        id: 'cust-3',
        first_name: 'Carlos',
        last_name: 'Gómez',
        phone: '555-0188',
        email: 'carlos@gmail.com',
        address_line: 'Paseo de la Reforma 45',
        status: 'SUSPENDIDO',
        current_balance: 0.00,
        is_network_suspended: 1,
        synced_at: Date.now(),
      }
    ],
    outbox_events: [] as any[],
    sync_metadata: [] as any[],
  };

  async execAsync(sql: string): Promise<void> {
    // mock no-op
  }

  async runAsync(sql: string, ...params: any[]): Promise<any> {
    if (sql.includes('INSERT INTO outbox_events') || sql.includes('INSERT OR REPLACE INTO outbox_events')) {
      const [id, deviceId, userId, aggregateType, aggregateId, operation, clientRequestId, payload, status, attempts, occurredAt] = params;
      this.memoryStore.outbox_events.push({
        id,
        device_id: deviceId,
        user_id: userId,
        aggregate_type: aggregateType,
        aggregate_id: aggregateId,
        operation,
        client_request_id: clientRequestId,
        payload,
        status,
        attempts,
        occurred_at: occurredAt,
        synced_at: null,
      });
      return { changes: 1, lastInsertRowId: 1 };
    }

    if (sql.includes('UPDATE customers SET current_balance')) {
      const [amount, customerId] = params;
      const customer = this.memoryStore.customers.find(c => c.id === customerId);
      if (customer) {
        customer.current_balance = Math.max(0, customer.current_balance - amount);
      }
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (sql.includes('INSERT OR REPLACE INTO sync_metadata')) {
      const [entity, lastSync] = params;
      const existing = this.memoryStore.sync_metadata.find(s => s.entity === entity);
      if (existing) {
        existing.last_sync = lastSync;
      } else {
        this.memoryStore.sync_metadata.push({ entity, last_sync: lastSync });
      }
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (sql.includes('INSERT OR REPLACE INTO customers')) {
      const [id, firstName, lastName, phone, email, addressLine, status, currentBalance, isNetworkSuspended, syncedAt] = params;
      const index = this.memoryStore.customers.findIndex(c => c.id === id);
      const row = {
        id,
        first_name: firstName,
        last_name: lastName,
        phone: phone ?? null,
        email: email ?? null,
        address_line: addressLine ?? null,
        status,
        current_balance: currentBalance,
        is_network_suspended: isNetworkSuspended,
        synced_at: syncedAt
      };
      if (index >= 0) {
        this.memoryStore.customers[index] = row;
      } else {
        this.memoryStore.customers.push(row);
      }
      return { changes: 1, lastInsertRowId: 0 };
    }

    if (sql.includes('UPDATE outbox_events SET status')) {
      const status = params[0];
      const eventId = params[params.length - 1];
      const ev = this.memoryStore.outbox_events.find(e => e.id === eventId);
      if (ev) {
        ev.status = status;
        if (status === 'synced') {
          ev.synced_at = Date.now();
        }
      }
      return { changes: 1, lastInsertRowId: 0 };
    }

    return { changes: 0, lastInsertRowId: 0 };
  }

  async getAllAsync<T>(sql: string, ...params: any[]): Promise<T[]> {
    if (sql.includes('FROM customers')) {
      let filtered = [...this.memoryStore.customers];
      if (sql.includes('current_balance > 0')) {
        filtered = filtered.filter(c => c.current_balance > 0);
      }
      if (params.length > 0) {
        const queryVal = String(params[0]).replace(/%/g, '').toLowerCase();
        if (queryVal) {
          filtered = filtered.filter(c => 
            c.first_name.toLowerCase().includes(queryVal) ||
            c.last_name.toLowerCase().includes(queryVal) ||
            (c.phone && c.phone.includes(queryVal))
          );
        }
      }
      return filtered as unknown as T[];
    }
    if (sql.includes('FROM outbox_events')) {
      return this.memoryStore.outbox_events as unknown as T[];
    }
    return [];
  }

  async getFirstAsync<T>(sql: string, ...params: any[]): Promise<T | null> {
    if (sql.includes('FROM customers WHERE id = ?')) {
      const id = params[0];
      const found = this.memoryStore.customers.find(c => c.id === id);
      return (found || null) as unknown as T;
    }
    if (sql.includes('FROM sync_metadata WHERE entity =')) {
      const entity = params[0] || 'customers';
      const found = this.memoryStore.sync_metadata.find(s => s.entity === entity);
      return (found || null) as unknown as T;
    }
    if (sql.includes('COUNT(*) as count FROM outbox_events')) {
      const count = this.memoryStore.outbox_events.filter(e => e.status === 'pending' || e.status === 'failed').length;
      return { count } as unknown as T;
    }
    return null;
  }
}

let _db: any = null;

export async function getDb(): Promise<any> {
  if (_db) return _db;

  if (isWeb) {
    _db = new WebSQLiteMock();
  } else {
    _db = await SQLite.openDatabaseAsync('deluxnet.db');
    await runMigrations(_db);
  }
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
      is_network_suspended INTEGER NOT NULL DEFAULT 0,
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

  try {
    await db.execAsync('ALTER TABLE customers ADD COLUMN is_network_suspended INTEGER NOT NULL DEFAULT 0;');
  } catch (e) {
    // Ignore error if column already exists
  }
}

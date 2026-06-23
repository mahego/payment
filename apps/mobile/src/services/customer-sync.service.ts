import { getDb } from '../database/db';
import api from './api.service';

export interface LocalCustomer {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  address_line: string | null;
  status: string;
  current_balance: number;
  synced_at: number;
}

interface ApiCustomer {
  id: string;
  firstName: string;
  lastName: string;
  phone?: string | null;
  email?: string | null;
  addressLine?: string;
  status: string;
  currentBalance: number;
}

/**
 * Pull customers from the API and store them in SQLite for offline access.
 */
export async function syncCustomersFromServer(): Promise<{
  downloaded: number;
  lastSync: Date;
}> {
  const res = await api.get<ApiCustomer[]>('/customers');
  const customers = res.data;
  const db = await getDb();
  const now = Date.now();

  // Batch upsert all customers into SQLite
  for (const c of customers) {
    await db.runAsync(
      `INSERT OR REPLACE INTO customers
        (id, first_name, last_name, phone, email, address_line, status, current_balance, synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      c.id,
      c.firstName,
      c.lastName,
      c.phone ?? null,
      c.email ?? null,
      c.addressLine ?? null,
      c.status,
      c.currentBalance,
      now,
    );
  }

  // Update sync metadata
  await db.runAsync(
    `INSERT OR REPLACE INTO sync_metadata (entity, last_sync) VALUES ('customers', ?)`,
    now,
  );

  return { downloaded: customers.length, lastSync: new Date(now) };
}

/**
 * Get all customers from SQLite with optional text search.
 */
export async function getLocalCustomers(
  query?: string,
): Promise<LocalCustomer[]> {
  const db = await getDb();

  if (query && query.trim().length > 0) {
    const q = `%${query.trim()}%`;
    return db.getAllAsync<LocalCustomer>(
      `SELECT * FROM customers
       WHERE first_name LIKE ? OR last_name LIKE ? OR phone LIKE ?
       ORDER BY current_balance DESC, first_name ASC`,
      q,
      q,
      q,
    );
  }

  return db.getAllAsync<LocalCustomer>(
    `SELECT * FROM customers ORDER BY first_name ASC, last_name ASC`,
  );
}

/**
 * Get customers with outstanding balance (for the route view).
 */
export async function getLocalCustomersWithDebt(): Promise<LocalCustomer[]> {
  const db = await getDb();
  return db.getAllAsync<LocalCustomer>(
    `SELECT * FROM customers
     WHERE current_balance > 0
     ORDER BY current_balance DESC`,
  );
}

/**
 * Get a single customer from SQLite.
 */
export async function getLocalCustomer(
  id: string,
): Promise<LocalCustomer | null> {
  const db = await getDb();
  return db.getFirstAsync<LocalCustomer>(
    `SELECT * FROM customers WHERE id = ?`,
    id,
  );
}

/**
 * Update local balance after a payment is recorded offline.
 */
export async function updateLocalBalance(
  customerId: string,
  paymentAmount: number,
): Promise<void> {
  const db = await getDb();
  await db.runAsync(
    `UPDATE customers SET current_balance = MAX(0, current_balance - ?) WHERE id = ?`,
    paymentAmount,
    customerId,
  );
}

/**
 * Get the last sync timestamp for customers.
 */
export async function getLastSyncTime(): Promise<Date | null> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ last_sync: number }>(
    `SELECT last_sync FROM sync_metadata WHERE entity = 'customers'`,
  );
  return row ? new Date(row.last_sync) : null;
}

/**
 * Get count of pending outbox events.
 */
export async function getPendingOutboxCount(): Promise<number> {
  const db = await getDb();
  const row = await db.getFirstAsync<{ count: number }>(
    `SELECT COUNT(*) as count FROM outbox_events WHERE status IN ('pending', 'failed')`,
  );
  return row?.count ?? 0;
}

/**
 * Get all outbox events for display.
 */
export interface OutboxEventRow {
  id: string;
  aggregate_type: string;
  aggregate_id: string;
  operation: string;
  client_request_id: string;
  payload: string;
  status: string;
  error_message: string | null;
  attempts: number;
  occurred_at: number;
  synced_at: number | null;
}

export async function getOutboxEvents(): Promise<OutboxEventRow[]> {
  const db = await getDb();
  return db.getAllAsync<OutboxEventRow>(
    `SELECT * FROM outbox_events ORDER BY occurred_at DESC LIMIT 50`,
  );
}

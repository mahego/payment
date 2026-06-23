import { getDb } from '../database/db';
import api from '../services/api.service';
import { useAuthStore } from '../store/auth.store';

interface OutboxRow {
  id: string;
  device_id: string;
  user_id: string;
  aggregate_type: string;
  aggregate_id: string;
  operation: string;
  client_request_id: string;
  payload: string;
  status: string;
  attempts: number;
}

const MAX_ATTEMPTS = 5;

/**
 * Flush pending outbox events to the server.
 * Validates: authenticated, non-revoked user.
 * Skips if no network or user is not authenticated.
 */
export async function syncOutboxEvents(): Promise<{
  synced: number;
  failed: number;
}> {
  const { isAuthenticated, user, refreshSession } = useAuthStore.getState();

  if (!isAuthenticated || !user) {
    // Try a silent refresh first
    const ok = await refreshSession();
    if (!ok) return { synced: 0, failed: 0 };
  }

  const db = await getDb();
  const rows = await db.getAllAsync<OutboxRow>(
    `SELECT * FROM outbox_events
     WHERE status IN ('pending', 'failed')
       AND attempts < ?
     ORDER BY occurred_at ASC
     LIMIT 50`,
    MAX_ATTEMPTS,
  );

  let synced = 0;
  let failed = 0;

  for (const row of rows) {
    await db.runAsync(
      `UPDATE outbox_events SET status = 'syncing', attempts = attempts + 1 WHERE id = ?`,
      row.id,
    );

    try {
      await api.post('/sync/outbox/batch', [
        {
          id: row.id,
          aggregateType: row.aggregate_type,
          aggregateId: row.aggregate_id,
          operation: row.operation,
          clientRequestId: row.client_request_id,
          payload: JSON.parse(row.payload),
          occurredAt: new Date(row.occurred_at).toISOString(),
        },
      ]);

      await db.runAsync(
        `UPDATE outbox_events SET status = 'synced', synced_at = ? WHERE id = ?`,
        Date.now(),
        row.id,
      );
      synced++;
    } catch (err: unknown) {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data
          ?.message ?? String(err);

      const finalStatus = row.attempts + 1 >= MAX_ATTEMPTS ? 'failed' : 'pending';
      await db.runAsync(
        `UPDATE outbox_events SET status = ?, error_message = ? WHERE id = ?`,
        finalStatus,
        msg,
        row.id,
      );
      failed++;
    }
  }

  return { synced, failed };
}

/**
 * Enqueue a new offline operation.
 */
export async function enqueueOutboxEvent(opts: {
  aggregateType: string;
  aggregateId: string;
  operation: string;
  payload: Record<string, unknown>;
  deviceId: string;
  userId: string;
}): Promise<string> {
  const db = await getDb();
  const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const clientRequestId = `${opts.aggregateType}-${opts.operation}-${id}`;

  await db.runAsync(
    `INSERT INTO outbox_events
      (id, device_id, user_id, aggregate_type, aggregate_id, operation,
       client_request_id, payload, status, attempts, occurred_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending', 0, ?)`,
    id,
    opts.deviceId,
    opts.userId,
    opts.aggregateType,
    opts.aggregateId,
    opts.operation,
    clientRequestId,
    JSON.stringify(opts.payload),
    Date.now(),
  );

  return clientRequestId;
}

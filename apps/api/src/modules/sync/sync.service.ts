import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { OutboxEventDto } from './dto/sync-outbox.dto';
import { OutboxStatus } from '@prisma/client';

@Injectable()
export class SyncService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentsService: PaymentsService,
  ) {}

  async processBatch(events: OutboxEventDto[], userId: string) {
    if (!events || !Array.isArray(events) || events.length === 0) {
      throw new BadRequestException('Events array cannot be empty');
    }

    let successes = 0;
    let failures = 0;
    const results = [];

    for (const event of events) {
      const deviceId = event.deviceId ?? 'mobile-app';

      // Ensure the OutboxEvent is created/upserted in our database for audit log
      await this.prisma.outboxEvent.upsert({
        where: { clientRequestId: event.clientRequestId },
        create: {
          id: event.id,
          deviceId,
          userId,
          aggregateType: event.aggregateType,
          aggregateId: event.aggregateId,
          operation: event.operation,
          clientRequestId: event.clientRequestId,
          payload: event.payload as any,
          status: OutboxStatus.SYNCING,
          occurredAt: new Date(event.occurredAt),
        },
        update: {
          attempts: { increment: 1 },
          status: OutboxStatus.SYNCING,
        },
      });

      try {
        if (event.aggregateType === 'Payment' && event.operation === 'create') {
          const payload = event.payload;

          if (!payload.customerId || !payload.amount || !payload.method) {
            throw new Error('Invalid payment payload inside outbox event');
          }

          // Register payment (idempotency is handled inside paymentsService.create)
          await this.paymentsService.create(
            {
              customerId: payload.customerId,
              amount: Number(payload.amount),
              method: payload.method,
              notes: payload.notes ?? `Sincronizado desde móvil. Originalmente cobrado: ${event.occurredAt}`,
              clientRequestId: event.clientRequestId,
              paidAt: event.occurredAt,
            },
            userId,
          );
        } else {
          throw new Error(`Unsupported sync aggregateType: ${event.aggregateType} or operation: ${event.operation}`);
        }

        // Update outbox event as Synced
        await this.prisma.outboxEvent.update({
          where: { clientRequestId: event.clientRequestId },
          data: {
            status: OutboxStatus.SYNCED,
            syncedAt: new Date(),
          },
        });

        successes++;
        results.push({ id: event.id, status: 'SYNCED' });
      } catch (error: any) {
        console.error(`Failed to process outbox event ${event.id}:`, error);

        // Update outbox event as Failed
        await this.prisma.outboxEvent.update({
          where: { clientRequestId: event.clientRequestId },
          data: {
            status: OutboxStatus.FAILED,
            errorMessage: error.message || String(error),
          },
        });

        failures++;
        results.push({ id: event.id, status: 'FAILED', error: error.message });

        // If the mobile app expects a failed HTTP request when syncing a single event fails,
        // we throw an exception.
        if (events.length === 1) {
          throw new BadRequestException(`Sync failed: ${error.message}`);
        }
      }
    }

    return {
      processed: events.length,
      successes,
      failures,
      results,
    };
  }
}

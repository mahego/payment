import { Injectable, OnApplicationBootstrap, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MikrotikService } from './mikrotik.service';
import { CustomerStatus } from '@prisma/client';
import { NetworkActionsService } from '../network-actions/network-actions.service';

@Injectable()
export class CutoffCronService implements OnApplicationBootstrap {
  private readonly logger = new Logger(CutoffCronService.name);
  private timer: NodeJS.Timeout | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly mikrotikService: MikrotikService,
    private readonly networkActionsService: NetworkActionsService,
  ) {}

  onApplicationBootstrap() {
    this.scheduleNextRun();
  }

  private scheduleNextRun() {
    const now = new Date();
    const nextRun = new Date();
    // Schedule for 00:05 AM next day
    nextRun.setHours(24, 5, 0, 0); 
    const msUntilRun = nextRun.getTime() - now.getTime();

    this.logger.log(`Billing cutoff task scheduled to run in ${Math.round(msUntilRun / 1000 / 60)} minutes`);

    this.timer = setTimeout(async () => {
      try {
        await this.runBillingCutoff();
      } catch (err: any) {
        this.logger.error(`Error in billing cutoff run: ${err.message}`);
      } finally {
        this.scheduleNextRun();
      }
    }, msUntilRun);
  }

  async runBillingCutoff() {
    this.logger.log('Starting daily billing cutoff verification...');
    const todayDay = new Date().getDate();

    // Find active customers whose billingCutoffDay is today AND have currentBalance > 0
    const customersToSuspend = await this.prisma.customer.findMany({
      where: {
        status: CustomerStatus.ACTIVO,
        billingCutoffDay: todayDay,
        currentBalance: { gt: 0 },
      },
    });

    this.logger.log(`Found ${customersToSuspend.length} customers to suspend today (Cutoff Day: ${todayDay}).`);

    let successCount = 0;
    for (const customer of customersToSuspend) {
      if (!customer.mikrotikProfileId) {
        this.logger.warn(`Skip suspend: Customer ${customer.id} has no assigned MikroTik profile.`);
        continue;
      }
      this.logger.log(`Queueing suspension for customer ${customer.firstName} ${customer.lastName} due to unpaid balance ($${customer.currentBalance})...`);
      try {
        await this.networkActionsService.queueAction(
          'SUSPEND_CUSTOMER',
          customer.mikrotikProfileId,
          customer.id,
        );
        successCount++;
      } catch (queueErr: any) {
        this.logger.error(`Failed to queue suspension for customer ${customer.id}: ${queueErr.message}`);
      }
    }

    this.logger.log(`Suspension run finished: ${successCount}/${customersToSuspend.length} queued successfully.`);
    return {
      processed: customersToSuspend.length,
      suspended: successCount,
    };
  }
}

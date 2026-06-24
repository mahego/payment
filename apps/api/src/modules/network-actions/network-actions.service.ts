import { Injectable, NotFoundException, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NetworkActionType, NetworkActionStatus } from '@prisma/client';
import { MikrotikService } from '../mikrotik/mikrotik.service';

@Injectable()
export class NetworkActionsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => MikrotikService))
    private readonly mikrotikService: MikrotikService,
  ) {}

  async findAll(filters?: { status?: NetworkActionStatus; actionType?: NetworkActionType; customerId?: string }) {
    const where: any = {};
    if (filters?.status) where.status = filters.status;
    if (filters?.actionType) where.actionType = filters.actionType;
    if (filters?.customerId) where.customerId = filters.customerId;

    return this.prisma.networkAction.findMany({
      where,
      include: {
        profile: { select: { name: true } },
        customer: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const action = await this.prisma.networkAction.findUnique({
      where: { id },
      include: {
        profile: { select: { name: true, host: true } },
        customer: true,
      },
    });
    if (!action) throw new NotFoundException('Network action not found');
    return action;
  }

  async queueAction(
    type: NetworkActionType,
    profileId: string,
    customerId: string | null,
    payload: any = {},
  ) {
    const action = await this.prisma.networkAction.create({
      data: {
        actionType: type,
        profileId,
        customerId,
        payload,
        status: 'PENDING',
      },
    });

    // Run the action in the background (non-blocking)
    this.executeActionAsync(action.id).catch((err) => {
      console.error(`Background action ${action.id} failed:`, err);
    });

    return action;
  }

  async retryAction(id: string) {
    const action = await this.prisma.networkAction.findUnique({ where: { id } });
    if (!action) throw new NotFoundException('Network action not found');

    const updated = await this.prisma.networkAction.update({
      where: { id },
      data: {
        status: 'PENDING',
        errorMessage: null,
      },
    });

    this.executeActionAsync(updated.id).catch((err) => {
      console.error(`Background retried action ${updated.id} failed:`, err);
    });

    return updated;
  }

  private async executeActionAsync(actionId: string): Promise<void> {
    const action = await this.prisma.networkAction.findUnique({
      where: { id: actionId },
      include: { customer: true, profile: true },
    });

    if (!action) return;

    // Transition to RUNNING
    await this.prisma.networkAction.update({
      where: { id: actionId },
      data: { status: 'RUNNING' },
    });

    try {
      const payload = action.payload as any;
      if (action.actionType === 'TEST_CONNECTION') {
        await this.mikrotikService.testConnection(action.profileId);
      } else if (action.actionType === 'SUSPEND_CUSTOMER') {
        if (!action.customer) throw new Error('Customer is missing for suspension');
        await this.mikrotikService.suspendCustomerOnRouter(action.profileId, action.customer);
        
        // Update client status & flags
        await this.prisma.customer.update({
          where: { id: action.customerId! },
          data: {
            status: 'SUSPENDIDO',
            isNetworkSuspended: true,
            lastSuspendedAt: new Date(),
          },
        });
      } else if (action.actionType === 'REACTIVATE_CUSTOMER') {
        if (!action.customer) throw new Error('Customer is missing for reactivation');
        await this.mikrotikService.reactivateCustomerOnRouter(action.profileId, action.customer);

        // Update client status & flags
        await this.prisma.customer.update({
          where: { id: action.customerId! },
          data: {
            status: 'ACTIVO',
            isNetworkSuspended: false,
            lastReactivatedAt: new Date(),
          },
        });
      } else if (action.actionType === 'DISABLE_PPPOE') {
        const username = payload?.['username'] as string;
        if (!username) throw new Error('Missing username in payload');
        await this.mikrotikService.disablePPPoEUser(action.profileId, username);
        await this.mikrotikService.kickActivePppoeUser(action.profileId, username);
      } else if (action.actionType === 'ENABLE_PPPOE') {
        const username = payload?.['username'] as string;
        if (!username) throw new Error('Missing username in payload');
        await this.mikrotikService.enablePPPoEUser(action.profileId, username);
      } else if (action.actionType === 'DISABLE_QUEUE') {
        const queueName = payload?.['queueName'] as string;
        if (!queueName) throw new Error('Missing queueName in payload');
        await this.mikrotikService.disableSimpleQueue(action.profileId, queueName);
      } else if (action.actionType === 'ENABLE_QUEUE') {
        const queueName = payload?.['queueName'] as string;
        if (!queueName) throw new Error('Missing queueName in payload');
        await this.mikrotikService.enableSimpleQueue(action.profileId, queueName);
      } else if (action.actionType === 'DISABLE_HOTSPOT') {
        const username = payload?.['username'] as string;
        if (!username) throw new Error('Missing username in payload');
        await this.mikrotikService.disableHotspotUser(action.profileId, username);
      } else if (action.actionType === 'ENABLE_HOTSPOT') {
        const username = payload?.['username'] as string;
        if (!username) throw new Error('Missing username in payload');
        await this.mikrotikService.enableHotspotUser(action.profileId, username);
      } else if (action.actionType === 'ADD_ADDRESS_LIST') {
        const ip = payload?.['ip'] as string;
        const list = payload?.['list'] as string;
        if (!ip || !list) throw new Error('Missing ip/list in payload');
        await this.mikrotikService.addIpToAddressList(action.profileId, ip, list);
      } else if (action.actionType === 'REMOVE_ADDRESS_LIST') {
        const ip = payload?.['ip'] as string;
        const list = payload?.['list'] as string;
        if (!ip || !list) throw new Error('Missing ip/list in payload');
        await this.mikrotikService.removeIpFromAddressList(action.profileId, ip, list);
      }

      // Mark SUCCESS
      await this.prisma.networkAction.update({
        where: { id: actionId },
        data: {
          status: 'SUCCESS',
          executedAt: new Date(),
          attempts: { increment: 1 },
        },
      });

      // Audit log success
      await this.prisma.auditLog.create({
        data: {
          entityType: 'NetworkAction',
          entityId: actionId,
          action: `network_action.${action.actionType.toLowerCase()}.success`,
          metadata: { profileName: action.profile.name, customerName: action.customer ? `${action.customer.firstName} ${action.customer.lastName}` : null },
        },
      });

    } catch (err: any) {
      const errMsg = err.message || String(err);
      
      // Mark FAILED
      await this.prisma.networkAction.update({
        where: { id: actionId },
        data: {
          status: 'FAILED',
          errorMessage: errMsg,
          attempts: { increment: 1 },
        },
      });

      // Audit log failure
      await this.prisma.auditLog.create({
        data: {
          entityType: 'NetworkAction',
          entityId: actionId,
          action: `network_action.${action.actionType.toLowerCase()}.failed`,
          metadata: { error: errMsg, profileName: action.profile.name },
        },
      });
    }
  }
}

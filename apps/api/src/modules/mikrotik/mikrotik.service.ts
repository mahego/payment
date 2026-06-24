import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MikrotikProfile, Customer } from '@prisma/client';
import { CreateMikrotikProfileDto } from './dto/create-profile.dto';
import { UpdateMikrotikProfileDto } from './dto/update-profile.dto';
import { MikrotikTcpClient } from './mikrotik-tcp.client';
import { CryptoHelper } from '../../common/utils/crypto.helper';

@Injectable()
export class MikrotikService {
  private readonly logger = new Logger(MikrotikService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Sanitizer Helper ────────────────────────────

  private sanitizeProfile(profile: MikrotikProfile | null): any {
    if (!profile) return null;
    const { password, ...rest } = profile;
    return rest;
  }

  // ─── Profile CRUD ────────────────────────────────

  async createProfile(dto: CreateMikrotikProfileDto) {
    const existing = await this.prisma.mikrotikProfile.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Profile name already exists');

    const profile = await this.prisma.mikrotikProfile.create({
      data: {
        name: dto.name,
        host: dto.host,
        port: dto.port ?? 8728,
        username: dto.username,
        password: CryptoHelper.encrypt(dto.password),
        suspensionType: dto.suspensionType ?? 'PPPOE',
        pppoeService: dto.pppoeService ?? null,
        addressListName: dto.addressListName ?? 'suspended',
        active: dto.active ?? true,
        zoneName: dto.zoneName ?? null,
        description: dto.description ?? null,
        connectionType: dto.connectionType ?? 'VPN',
        status: 'PENDING',
      },
    });

    return this.sanitizeProfile(profile);
  }

  async findAllProfiles() {
    const profiles = await this.prisma.mikrotikProfile.findMany({
      orderBy: { name: 'asc' },
    });
    return profiles.map((p) => this.sanitizeProfile(p));
  }

  async findOneProfile(id: string) {
    const profile = await this.prisma.mikrotikProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Mikrotik Profile not found');
    return this.sanitizeProfile(profile);
  }

  async updateProfile(id: string, dto: UpdateMikrotikProfileDto) {
    const existing = await this.prisma.mikrotikProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mikrotik Profile not found');

    const profile = await this.prisma.mikrotikProfile.update({
      where: { id },
      data: {
        name: dto.name,
        host: dto.host,
        port: dto.port,
        username: dto.username,
        password: dto.password ? CryptoHelper.encrypt(dto.password) : undefined,
        suspensionType: dto.suspensionType,
        pppoeService: dto.pppoeService,
        addressListName: dto.addressListName,
        active: dto.active,
        zoneName: dto.zoneName,
        description: dto.description,
        connectionType: dto.connectionType,
      },
    });

    return this.sanitizeProfile(profile);
  }

  async removeProfile(id: string) {
    const existing = await this.prisma.mikrotikProfile.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Mikrotik Profile not found');
    
    await this.prisma.mikrotikProfile.delete({ where: { id } });
    return { success: true };
  }

  // ─── Connection Testing ──────────────────────────

  async testConnection(profileId: string) {
    const profile = await this.prisma.mikrotikProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException('MikroTik Profile not found');

    const client = new MikrotikTcpClient(profile.host, profile.port);
    const decryptedPassword = CryptoHelper.decrypt(profile.password);

    try {
      await client.connect();
      await client.writeCommand([
        '/login',
        `=name=${profile.username}`,
        `=password=${decryptedPassword}`,
      ]);

      const identityRes = await client.writeCommand(['/system/identity/print']);
      let identity = 'Unknown';
      for (const word of identityRes) {
        if (word.startsWith('=name=')) {
          identity = word.replace('=name=', '');
          break;
        }
      }
      client.close();

      await this.prisma.mikrotikProfile.update({
        where: { id: profileId },
        data: {
          status: 'ONLINE',
          lastSeenAt: new Date(),
          lastConnectionTestAt: new Date(),
        },
      });

      return { success: true, identity };
    } catch (err: any) {
      client.close();
      await this.prisma.mikrotikProfile.update({
        where: { id: profileId },
        data: {
          status: 'ERROR',
          lastConnectionTestAt: new Date(),
        },
      });
      throw new Error(`Connection test failed: ${err.message || String(err)}`);
    }
  }

  // ─── CLI Command Execution ─────────────────────────

  private async executeCommandsOnRouter(profileId: string, commands: string[][]): Promise<string[][]> {
    const profile = await this.prisma.mikrotikProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException(`MikroTik profile ${profileId} not found`);
    if (!profile.active) throw new Error(`MikroTik profile ${profile.name} is inactive`);

    const client = new MikrotikTcpClient(profile.host, profile.port);
    const decryptedPassword = CryptoHelper.decrypt(profile.password);

    try {
      await client.connect();
      await client.writeCommand([
        '/login',
        `=name=${profile.username}`,
        `=password=${decryptedPassword}`,
      ]);

      const allResults: string[][] = [];
      for (const cmd of commands) {
        const log = await this.prisma.mikrotikCommandLog.create({
          data: {
            profileId: profile.id,
            command: cmd.join(' '),
            payload: { words: cmd },
            status: 'PENDING',
          },
        });

        try {
          const res = await client.writeCommand(cmd);
          await this.prisma.mikrotikCommandLog.update({
            where: { id: log.id },
            data: { status: 'SUCCESS', executedAt: new Date() },
          });
          allResults.push(res);
        } catch (cmdErr: any) {
          await this.prisma.mikrotikCommandLog.update({
            where: { id: log.id },
            data: {
              status: 'FAILED',
              errorMessage: cmdErr.message || String(cmdErr),
              attempts: 1,
            },
          });
          throw cmdErr;
        }
      }

      // Update router status to ONLINE after successful execution
      await this.prisma.mikrotikProfile.update({
        where: { id: profileId },
        data: { status: 'ONLINE', lastSeenAt: new Date() },
      }).catch(() => {});

      client.close();
      return allResults;
    } catch (err: any) {
      client.close();
      // Update router status to OFFLINE or ERROR
      await this.prisma.mikrotikProfile.update({
        where: { id: profileId },
        data: { status: 'ERROR' },
      }).catch(() => {});
      throw err;
    }
  }

  // ─── MikroTik Low-level Command Implementations ──────

  async getRouterIdentity(profileId: string): Promise<string> {
    const res = await this.executeCommandsOnRouter(profileId, [['/system/identity/print']]);
    let identity = 'Unknown';
    if (res.length > 0) {
      for (const word of res[0]) {
        if (word.startsWith('=name=')) {
          identity = word.replace('=name=', '');
          break;
        }
      }
    }
    return identity;
  }

  async listPPPoESecrets(profileId: string): Promise<any[]> {
    return this.executeCommandsOnRouter(profileId, [['/ppp/secret/print']]);
  }

  async disablePPPoEUser(profileId: string, username: string): Promise<void> {
    await this.executeCommandsOnRouter(profileId, [
      [
        '/ppp/secret/set',
        `=.id=${username}`,
        '=disabled=yes',
      ]
    ]);
  }

  async enablePPPoEUser(profileId: string, username: string): Promise<void> {
    await this.executeCommandsOnRouter(profileId, [
      [
        '/ppp/secret/set',
        `=.id=${username}`,
        '=disabled=no',
      ]
    ]);
  }

  async disableSimpleQueue(profileId: string, queueName: string): Promise<void> {
    await this.executeCommandsOnRouter(profileId, [
      [
        '/queue/simple/set',
        `=.id=${queueName}`,
        '=max-limit=64k/64k',
      ]
    ]);
  }

  async enableSimpleQueue(profileId: string, queueName: string): Promise<void> {
    await this.executeCommandsOnRouter(profileId, [
      [
        '/queue/simple/set',
        `=.id=${queueName}`,
        '=max-limit=0/0',
      ]
    ]);
  }

  async disableHotspotUser(profileId: string, username: string): Promise<void> {
    await this.executeCommandsOnRouter(profileId, [
      [
        '/ip/hotspot/user/set',
        `=.id=${username}`,
        '=disabled=yes',
      ]
    ]);
  }

  async enableHotspotUser(profileId: string, username: string): Promise<void> {
    await this.executeCommandsOnRouter(profileId, [
      [
        '/ip/hotspot/user/set',
        `=.id=${username}`,
        '=disabled=no',
      ]
    ]);
  }

  async addIpToAddressList(profileId: string, ipAddress: string, listName: string): Promise<void> {
    await this.executeCommandsOnRouter(profileId, [
      [
        '/ip/firewall/address-list/add',
        `=list=${listName}`,
        `=address=${ipAddress}`,
      ]
    ]);
  }

  async removeIpFromAddressList(profileId: string, ipAddress: string, listName: string): Promise<void> {
    const profile = await this.prisma.mikrotikProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) throw new NotFoundException(`MikroTik profile ${profileId} not found`);

    const client = new MikrotikTcpClient(profile.host, profile.port);
    const decryptedPassword = CryptoHelper.decrypt(profile.password);

    try {
      await client.connect();
      await client.writeCommand([
        '/login',
        `=name=${profile.username}`,
        `=password=${decryptedPassword}`,
      ]);

      const printRes = await client.writeCommand([
        '/ip/firewall/address-list/print',
        `?list=${listName}`,
        `?address=${ipAddress}`,
      ]);

      let recordId: string | null = null;
      for (const word of printRes) {
        if (word.startsWith('=.id=')) {
          recordId = word.replace('=.id=', '');
          break;
        }
      }

      if (recordId) {
        await client.writeCommand([
          '/ip/firewall/address-list/remove',
          `=.id=${recordId}`,
        ]);
      }
      client.close();
    } catch (err: any) {
      client.close();
      throw err;
    }
  }

  async kickActivePppoeUser(profileId: string, username: string): Promise<void> {
    const profile = await this.prisma.mikrotikProfile.findUnique({
      where: { id: profileId },
    });
    if (!profile) return;

    const client = new MikrotikTcpClient(profile.host, profile.port);
    const decryptedPassword = CryptoHelper.decrypt(profile.password);

    try {
      await client.connect();
      await client.writeCommand([
        '/login',
        `=name=${profile.username}`,
        `=password=${decryptedPassword}`,
      ]);

      const printRes = await client.writeCommand([
        '/ppp/active/print',
        `?name=${username}`,
      ]);

      let activeId: string | null = null;
      for (const word of printRes) {
        if (word.startsWith('=.id=')) {
          activeId = word.replace('=.id=', '');
          break;
        }
      }

      if (activeId) {
        await client.writeCommand([
          '/ppp/active/remove',
          `=.id=${activeId}`,
        ]);
        this.logger.log(`Kicked active PPPoE session for user: ${username}`);
      }
      client.close();
    } catch (err: any) {
      client.close();
      this.logger.warn(`Could not kick PPPoE user: ${err.message || String(err)}`);
    }
  }

  // ─── Mode routing suspension/reactivation actions ───

  async suspendCustomerOnRouter(profileId: string, customer: any): Promise<void> {
    const mode = customer.serviceMode;
    if (mode === 'PPPOE') {
      const username = customer.pppoeUsername;
      if (!username) throw new Error('Missing PPPoE username');
      await this.disablePPPoEUser(profileId, username);
      await this.kickActivePppoeUser(profileId, username);
    } else if (mode === 'SIMPLE_QUEUE') {
      const queueName = customer.simpleQueueName || customer.pppoeUsername || `${customer.firstName}_${customer.lastName}`;
      await this.disableSimpleQueue(profileId, queueName);
    } else if (mode === 'HOTSPOT') {
      const username = customer.hotspotUsername || customer.pppoeUsername;
      if (!username) throw new Error('Missing Hotspot username');
      await this.disableHotspotUser(profileId, username);
    } else if (mode === 'ADDRESS_LIST') {
      const ip = customer.ipAddress;
      if (!ip) throw new Error('Missing IP address');
      const listName = customer.suspensionAddressList || 'suspended';
      await this.addIpToAddressList(profileId, ip, listName);
    } else {
      throw new Error(`Unsupported service mode: ${mode}`);
    }
  }

  async reactivateCustomerOnRouter(profileId: string, customer: any): Promise<void> {
    const mode = customer.serviceMode;
    if (mode === 'PPPOE') {
      const username = customer.pppoeUsername;
      if (!username) throw new Error('Missing PPPoE username');
      await this.enablePPPoEUser(profileId, username);
    } else if (mode === 'SIMPLE_QUEUE') {
      const queueName = customer.simpleQueueName || customer.pppoeUsername || `${customer.firstName}_${customer.lastName}`;
      await this.enableSimpleQueue(profileId, queueName);
    } else if (mode === 'HOTSPOT') {
      const username = customer.hotspotUsername || customer.pppoeUsername;
      if (!username) throw new Error('Missing Hotspot username');
      await this.enableHotspotUser(profileId, username);
    } else if (mode === 'ADDRESS_LIST') {
      const ip = customer.ipAddress;
      if (!ip) throw new Error('Missing IP address');
      const listName = customer.suspensionAddressList || 'suspended';
      await this.removeIpFromAddressList(profileId, ip, listName);
    } else {
      throw new Error(`Unsupported service mode: ${mode}`);
    }
  }
}

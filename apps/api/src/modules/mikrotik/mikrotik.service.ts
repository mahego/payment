import { Injectable, NotFoundException, ConflictException, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MikrotikProfile, Customer, CustomerStatus } from '@prisma/client';
import { CreateMikrotikProfileDto } from './dto/create-profile.dto';
import { UpdateMikrotikProfileDto } from './dto/update-profile.dto';
import { MikrotikTcpClient } from './mikrotik-tcp.client';

@Injectable()
export class MikrotikService {
  private readonly logger = new Logger(MikrotikService.name);

  constructor(private readonly prisma: PrismaService) {}

  // ─── Profile CRUD ────────────────────────────────

  async createProfile(dto: CreateMikrotikProfileDto) {
    const existing = await this.prisma.mikrotikProfile.findUnique({
      where: { name: dto.name },
    });
    if (existing) throw new ConflictException('Profile name already exists');

    return this.prisma.mikrotikProfile.create({
      data: {
        name: dto.name,
        host: dto.host,
        port: dto.port ?? 8728,
        username: dto.username,
        password: dto.password,
        suspensionType: dto.suspensionType ?? 'PPPOE',
        pppoeService: dto.pppoeService ?? null,
        addressListName: dto.addressListName ?? 'suspended',
        active: dto.active ?? true,
      },
    });
  }

  async findAllProfiles() {
    return this.prisma.mikrotikProfile.findMany({
      orderBy: { name: 'asc' },
    });
  }

  async findOneProfile(id: string) {
    const profile = await this.prisma.mikrotikProfile.findUnique({
      where: { id },
    });
    if (!profile) throw new NotFoundException('Mikrotik Profile not found');
    return profile;
  }

  async updateProfile(id: string, dto: UpdateMikrotikProfileDto) {
    await this.findOneProfile(id);
    return this.prisma.mikrotikProfile.update({
      where: { id },
      data: {
        name: dto.name,
        host: dto.host,
        port: dto.port,
        username: dto.username,
        password: dto.password,
        suspensionType: dto.suspensionType,
        pppoeService: dto.pppoeService,
        addressListName: dto.addressListName,
        active: dto.active,
      },
    });
  }

  async removeProfile(id: string) {
    await this.findOneProfile(id);
    return this.prisma.mikrotikProfile.delete({ where: { id } });
  }

  // ─── Execution engine ─────────────────────────────

  private async executeCommands(profile: MikrotikProfile, customerId: string | null, commands: string[][]): Promise<string[][]> {
    const logs: any[] = [];
    for (const cmd of commands) {
      const log = await this.prisma.mikrotikCommandLog.create({
        data: {
          profileId: profile.id,
          customerId,
          command: cmd.join(' '),
          payload: { words: cmd },
          status: 'PENDING',
        },
      });
      logs.push(log);
    }

    const client = new MikrotikTcpClient(profile.host, profile.port);
    try {
      await client.connect();
      // Auth / login sentence
      await client.writeCommand([
        '/login',
        `=name=${profile.username}`,
        `=password=${profile.password}`,
      ]);

      const allResults: string[][] = [];
      for (let i = 0; i < commands.length; i++) {
        const cmd = commands[i];
        const log = logs[i];
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
      client.close();
      return allResults;
    } catch (err: any) {
      client.close();
      // Update pending logs to FAILED on connection issue
      for (const log of logs) {
        const currentLog = await this.prisma.mikrotikCommandLog.findUnique({
          where: { id: log.id },
        });
        if (currentLog && currentLog.status === 'PENDING') {
          await this.prisma.mikrotikCommandLog.update({
            where: { id: log.id },
            data: {
              status: 'FAILED',
              errorMessage: `Router Connection Error: ${err.message || String(err)}`,
              attempts: 1,
            },
          });
        }
      }
      this.logger.error(`Failed to execute commands on ${profile.name}: ${err.message}`);
      throw err;
    }
  }

  // ─── Suspend Customer ────────────────────────────

  async suspendCustomer(customerId: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { mikrotikProfile: true },
    });

    if (!customer || !customer.mikrotikProfile || !customer.mikrotikProfile.active) {
      this.logger.warn(`Skip suspend: Customer ${customerId} has no active MikroTik profile.`);
      return false;
    }

    const profile = customer.mikrotikProfile;
    const commands: string[][] = [];

    if (profile.suspensionType === 'PPPOE') {
      if (!customer.pppoeUsername) {
        this.logger.warn(`Skip suspend: Customer ${customerId} has no pppoeUsername defined.`);
        return false;
      }
      // Disable secret
      commands.push([
        '/ppp/secret/set',
        `=.id=${customer.pppoeUsername}`,
        '=disabled=yes',
      ]);
    } else if (profile.suspensionType === 'QUEUE') {
      const queueName = customer.pppoeUsername || `${customer.firstName}_${customer.lastName}`;
      commands.push([
        '/queue/simple/set',
        `=.id=${queueName}`,
        '=max-limit=64k/64k',
      ]);
    } else if (profile.suspensionType === 'ADDRESS_LIST') {
      if (!customer.ipAddress) {
        this.logger.warn(`Skip suspend: Customer ${customerId} has no ipAddress defined.`);
        return false;
      }
      const listName = profile.addressListName || 'suspended';
      commands.push([
        '/ip/firewall/address-list/add',
        `=list=${listName}`,
        `=address=${customer.ipAddress}`,
      ]);
    }

    try {
      await this.executeCommands(profile, customer.id, commands);

      // Kick active session if PPPoE
      if (profile.suspensionType === 'PPPOE' && customer.pppoeUsername) {
        await this.kickActivePppoeUser(profile, customer.pppoeUsername);
      }

      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { status: CustomerStatus.SUSPENDIDO },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Reactivate Customer ─────────────────────────

  async reactivateCustomer(customerId: string): Promise<boolean> {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      include: { mikrotikProfile: true },
    });

    if (!customer || !customer.mikrotikProfile || !customer.mikrotikProfile.active) {
      return false;
    }

    const profile = customer.mikrotikProfile;
    const commands: string[][] = [];

    if (profile.suspensionType === 'PPPOE') {
      if (!customer.pppoeUsername) return false;
      commands.push([
        '/ppp/secret/set',
        `=.id=${customer.pppoeUsername}`,
        '=disabled=no',
      ]);
    } else if (profile.suspensionType === 'QUEUE') {
      const queueName = customer.pppoeUsername || `${customer.firstName}_${customer.lastName}`;
      // Remove limit (or restore to blank/high speed, in simple queue it is max-limit=0/0)
      commands.push([
        '/queue/simple/set',
        `=.id=${queueName}`,
        '=max-limit=0/0',
      ]);
    } else if (profile.suspensionType === 'ADDRESS_LIST') {
      if (!customer.ipAddress) return false;
      const listName = profile.addressListName || 'suspended';
      
      // We must print/find the address list record ID first to remove it
      await this.removeIpFromAddressList(profile, customer.id, listName, customer.ipAddress);
      
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { status: CustomerStatus.ACTIVO },
      });
      return true;
    }

    try {
      await this.executeCommands(profile, customer.id, commands);
      await this.prisma.customer.update({
        where: { id: customer.id },
        data: { status: CustomerStatus.ACTIVO },
      });
      return true;
    } catch {
      return false;
    }
  }

  // ─── Helper helpers ──────────────────────────────

  private async kickActivePppoeUser(profile: MikrotikProfile, username: string) {
    const client = new MikrotikTcpClient(profile.host, profile.port);
    try {
      await client.connect();
      await client.writeCommand([
        '/login',
        `=name=${profile.username}`,
        `=password=${profile.password}`,
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
        this.logger.log(`Kicked active PPPoE user: ${username} (.id=${activeId})`);
      }
      client.close();
    } catch (err: any) {
      client.close();
      this.logger.error(`Failed to kick PPPoE user ${username}: ${err.message}`);
    }
  }

  private async removeIpFromAddressList(profile: MikrotikProfile, customerId: string, list: string, ip: string) {
    const client = new MikrotikTcpClient(profile.host, profile.port);
    try {
      await client.connect();
      await client.writeCommand([
        '/login',
        `=name=${profile.username}`,
        `=password=${profile.password}`,
      ]);

      const printRes = await client.writeCommand([
        '/ip/firewall/address-list/print',
        `?list=${list}`,
        `?address=${ip}`,
      ]);

      let recordId: string | null = null;
      for (const word of printRes) {
        if (word.startsWith('=.id=')) {
          recordId = word.replace('=.id=', '');
          break;
        }
      }

      if (recordId) {
        const cmd = ['/ip/firewall/address-list/remove', `=.id=${recordId}`];
        
        // Log locally
        const log = await this.prisma.mikrotikCommandLog.create({
          data: {
            profileId: profile.id,
            customerId,
            command: cmd.join(' '),
            payload: { words: cmd },
            status: 'PENDING',
          },
        });

        try {
          await client.writeCommand(cmd);
          await this.prisma.mikrotikCommandLog.update({
            where: { id: log.id },
            data: { status: 'SUCCESS', executedAt: new Date() },
          });
        } catch (cmdErr: any) {
          await this.prisma.mikrotikCommandLog.update({
            where: { id: log.id },
            data: { status: 'FAILED', errorMessage: cmdErr.message || String(cmdErr), attempts: 1 },
          });
          throw cmdErr;
        }
      }
      client.close();
    } catch (err: any) {
      client.close();
      this.logger.error(`Failed to remove IP ${ip} from list ${list}: ${err.message}`);
      throw err;
    }
  }
}

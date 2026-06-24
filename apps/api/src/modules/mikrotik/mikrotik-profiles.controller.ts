import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MikrotikService } from './mikrotik.service';
import { CreateMikrotikProfileDto } from './dto/create-profile.dto';
import { UpdateMikrotikProfileDto } from './dto/update-profile.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { Request } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

@ApiTags('mikrotik-profiles')
@ApiBearerAuth()
@Controller('mikrotik-profiles')
export class MikrotikProfilesController {
  constructor(
    private readonly service: MikrotikService,
    private readonly prisma: PrismaService,
  ) {}

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new Mikrotik profile' })
  async create(@Body() dto: CreateMikrotikProfileDto, @Req() req: Request) {
    const res = await this.service.createProfile(dto);
    
    // Log audit log
    const user: any = req.user;
    await this.prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        entityType: 'MikrotikProfile',
        entityId: res.id,
        action: 'mikrotik_profile.created',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        metadata: { name: dto.name },
      },
    });

    return res;
  }

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'List all Mikrotik profiles' })
  findAll() {
    return this.service.findAllProfiles();
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get profile details' })
  findOne(@Param('id') id: string) {
    return this.service.findOneProfile(id);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update Mikrotik profile' })
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateMikrotikProfileDto,
    @Req() req: Request,
  ) {
    const res = await this.service.updateProfile(id, dto);
    
    const user: any = req.user;
    await this.prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        entityType: 'MikrotikProfile',
        entityId: id,
        action: 'mikrotik_profile.updated',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        metadata: { name: dto.name },
      },
    });

    return res;
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete profile' })
  async remove(@Param('id') id: string, @Req() req: Request) {
    const res = await this.service.removeProfile(id);
    
    const user: any = req.user;
    await this.prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        entityType: 'MikrotikProfile',
        entityId: id,
        action: 'mikrotik_profile.deleted',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
      },
    });

    return res;
  }

  @Post(':id/test-connection')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Test connection to the router' })
  async testConnection(@Param('id') id: string, @Req() req: Request) {
    const res = await this.service.testConnection(id);
    
    const user: any = req.user;
    await this.prisma.auditLog.create({
      data: {
        userId: user?.id || null,
        entityType: 'MikrotikProfile',
        entityId: id,
        action: 'mikrotik_profile.connection_tested',
        ipAddress: req.ip,
        userAgent: req.headers['user-agent'] || null,
        metadata: { success: res.success, identity: res.identity },
      },
    });

    return res;
  }
}

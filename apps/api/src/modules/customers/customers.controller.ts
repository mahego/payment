import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
} from '@nestjs/swagger';
import { Role, CustomerStatus } from '@prisma/client';
import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { BulkActionDto } from './dto/bulk-action.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { NetworkActionsService } from '../network-actions/network-actions.service';

@ApiTags('customers')
@ApiBearerAuth()
@Controller('customers')
export class CustomersController {
  constructor(
    private readonly service: CustomersService,
    private readonly networkActionsService: NetworkActionsService,
  ) {}

  @Get()
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.COLLECTOR,
    Role.TECHNICIAN,
    Role.VIEWER,
  )
  @ApiOperation({ summary: 'List all customers' })
  @ApiQuery({ name: 'query', required: false, type: String, description: 'Search term' })
  @ApiQuery({ name: 'status', required: false, enum: CustomerStatus })
  @ApiQuery({ name: 'zoneId', required: false, type: String })
  @ApiQuery({ name: 'planId', required: false, type: String })
  findAll(
    @Query('query') query?: string,
    @Query('status') status?: CustomerStatus,
    @Query('zoneId') zoneId?: string,
    @Query('planId') planId?: string,
  ) {
    return this.service.findAll({ query, status, zoneId, planId });
  }

  @Get(':id')
  @Roles(
    Role.SUPER_ADMIN,
    Role.ADMIN,
    Role.SUPERVISOR,
    Role.COLLECTOR,
    Role.TECHNICIAN,
    Role.VIEWER,
  )
  @ApiOperation({ summary: 'Get customer by ID' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Create a new customer' })
  create(@Body() dto: CreateCustomerDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Update customer' })
  update(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete customer' })
  remove(@Param('id') id: string) {
    return this.service.remove(id);
  }

  @Get(':id/network')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR, Role.TECHNICIAN)
  @ApiOperation({ summary: 'Get customer network settings' })
  async getNetwork(@Param('id') id: string) {
    const customer = await this.service.findOne(id);
    return {
      mikrotikProfileId: customer.mikrotikProfileId,
      serviceMode: customer.serviceMode,
      pppoeUsername: customer.pppoeUsername,
      pppoePassword: customer.pppoePassword,
      ipAddress: customer.ipAddress,
      simpleQueueName: customer.simpleQueueName,
      hotspotUsername: customer.hotspotUsername,
      macAddress: customer.macAddress,
      suspensionAddressList: customer.suspensionAddressList,
      isNetworkSuspended: customer.isNetworkSuspended,
      lastSuspendedAt: customer.lastSuspendedAt,
      lastReactivatedAt: customer.lastReactivatedAt,
    };
  }

  @Patch(':id/network')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Update customer network settings' })
  async updateNetwork(@Param('id') id: string, @Body() dto: UpdateCustomerDto) {
    return this.service.update(id, dto);
  }

  @Post(':id/suspend')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Queue suspension action for client' })
  async suspend(@Param('id') id: string) {
    const customer = await this.service.findOne(id);
    if (!customer.mikrotikProfileId) {
      throw new BadRequestException('Customer has no assigned MikroTik router profile');
    }
    return this.networkActionsService.queueAction(
      'SUSPEND_CUSTOMER',
      customer.mikrotikProfileId,
      customer.id
    );
  }

  @Post(':id/reactivate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Queue reactivation action for client' })
  async reactivate(@Param('id') id: string) {
    const customer = await this.service.findOne(id);
    if (!customer.mikrotikProfileId) {
      throw new BadRequestException('Customer has no assigned MikroTik router profile');
    }
    return this.networkActionsService.queueAction(
      'REACTIVATE_CUSTOMER',
      customer.mikrotikProfileId,
      customer.id
    );
  }

  @Post('bulk-action')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Apply action to multiple customers in batch' })
  bulkAction(@Body() dto: BulkActionDto) {
    return this.service.bulkAction(dto);
  }
}

import {
  Controller,
  Get,
  Post,
  Param,
  Query,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Role, NetworkActionType, NetworkActionStatus } from '@prisma/client';
import { NetworkActionsService } from './network-actions.service';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('network-actions')
@ApiBearerAuth()
@Controller('network-actions')
export class NetworkActionsController {
  constructor(private readonly service: NetworkActionsService) {}

  @Get()
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'List all network actions queued' })
  @ApiQuery({ name: 'status', required: false, enum: NetworkActionStatus })
  @ApiQuery({ name: 'actionType', required: false, enum: NetworkActionType })
  @ApiQuery({ name: 'customerId', required: false, type: String })
  findAll(
    @Query('status') status?: NetworkActionStatus,
    @Query('actionType') actionType?: NetworkActionType,
    @Query('customerId') customerId?: string,
  ) {
    return this.service.findAll({ status, actionType, customerId });
  }

  @Get(':id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get details of a network action' })
  findOne(@Param('id') id: string) {
    return this.service.findOne(id);
  }

  @Post(':id/retry')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Retry a failed network action' })
  retry(@Param('id') id: string) {
    return this.service.retryAction(id);
  }
}

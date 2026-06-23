import { Controller, Post, Body, UseGuards } from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiBody } from '@nestjs/swagger';
import { Role, User } from '@prisma/client';
import { SyncService } from './sync.service';
import { OutboxEventDto } from './dto/sync-outbox.dto';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';

@ApiTags('sync')
@ApiBearerAuth()
@Controller('sync')
export class SyncController {
  constructor(private readonly service: SyncService) {}

  @Post('outbox/batch')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR, Role.COLLECTOR)
  @ApiOperation({ summary: 'Synchronize offline outbox events from mobile clients' })
  @ApiBody({ type: [OutboxEventDto] })
  processBatch(
    @Body() events: OutboxEventDto[],
    @CurrentUser() actor: User,
  ) {
    return this.service.processBatch(events, actor.id);
  }
}

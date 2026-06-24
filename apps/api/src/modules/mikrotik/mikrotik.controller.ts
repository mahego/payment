import {
  Controller,
  Post,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { Roles } from '../../common/decorators/roles.decorator';
import { CutoffCronService } from './cutoff-cron.service';

@ApiTags('mikrotik')
@ApiBearerAuth()
@Controller('mikrotik')
export class MikrotikController {
  constructor(
    private readonly cutoffCronService: CutoffCronService,
  ) {}

  @Post('cutoff/run')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Manually trigger the daily billing cutoff process' })
  runCutoff() {
    return this.cutoffCronService.runBillingCutoff();
  }
}

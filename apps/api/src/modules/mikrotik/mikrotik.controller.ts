import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { MikrotikService } from './mikrotik.service';
import { CreateMikrotikProfileDto } from './dto/create-profile.dto';
import { UpdateMikrotikProfileDto } from './dto/update-profile.dto';
import { Roles } from '../../common/decorators/roles.decorator';
import { CutoffCronService } from './cutoff-cron.service';

@ApiTags('mikrotik')
@ApiBearerAuth()
@Controller('mikrotik')
export class MikrotikController {
  constructor(
    private readonly mikrotikService: MikrotikService,
    private readonly cutoffCronService: CutoffCronService,
  ) {}

  @Post('profiles')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Create a new Mikrotik connection profile' })
  create(@Body() dto: CreateMikrotikProfileDto) {
    return this.mikrotikService.createProfile(dto);
  }

  @Get('profiles')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'List all Mikrotik connection profiles' })
  findAll() {
    return this.mikrotikService.findAllProfiles();
  }

  @Get('profiles/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN, Role.SUPERVISOR)
  @ApiOperation({ summary: 'Get profile details' })
  findOne(@Param('id') id: string) {
    return this.mikrotikService.findOneProfile(id);
  }

  @Patch('profiles/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Update Mikrotik connection profile' })
  update(@Param('id') id: string, @Body() dto: UpdateMikrotikProfileDto) {
    return this.mikrotikService.updateProfile(id, dto);
  }

  @Delete('profiles/:id')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Delete connection profile' })
  remove(@Param('id') id: string) {
    return this.mikrotikService.removeProfile(id);
  }

  @Post('customers/:id/suspend')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Manually suspend customer connection on Mikrotik' })
  suspend(@Param('id') id: string) {
    return this.mikrotikService.suspendCustomer(id);
  }

  @Post('customers/:id/reactivate')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Manually reactivate customer connection on Mikrotik' })
  reactivate(@Param('id') id: string) {
    return this.mikrotikService.reactivateCustomer(id);
  }

  @Post('cutoff/run')
  @Roles(Role.SUPER_ADMIN, Role.ADMIN)
  @ApiOperation({ summary: 'Manually trigger the daily billing cutoff process' })
  runCutoff() {
    return this.cutoffCronService.runBillingCutoff();
  }
}

import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MikrotikService } from './mikrotik.service';
import { MikrotikController } from './mikrotik.controller';
import { MikrotikProfilesController } from './mikrotik-profiles.controller';
import { CutoffCronService } from './cutoff-cron.service';

@Module({
  imports: [PrismaModule],
  controllers: [MikrotikController, MikrotikProfilesController],
  providers: [MikrotikService, CutoffCronService],
  exports: [MikrotikService, CutoffCronService],
})
export class MikrotikModule { }

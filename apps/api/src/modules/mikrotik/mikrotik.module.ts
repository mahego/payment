import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { MikrotikService } from './mikrotik.service';
import { MikrotikController } from './mikrotik.controller';
import { CutoffCronService } from './cutoff-cron.service';

@Module({
  imports: [PrismaModule],
  controllers: [MikrotikController],
  providers: [MikrotikService, CutoffCronService],
  exports: [MikrotikService, CutoffCronService],
})
export class MikrotikModule { }

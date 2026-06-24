import { Module, forwardRef } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { NetworkActionsService } from './network-actions.service';
import { NetworkActionsController } from './network-actions.controller';
import { MikrotikModule } from '../mikrotik/mikrotik.module';

@Module({
  imports: [
    PrismaModule,
    forwardRef(() => MikrotikModule),
  ],
  controllers: [NetworkActionsController],
  providers: [NetworkActionsService],
  exports: [NetworkActionsService],
})
export class NetworkActionsModule {}

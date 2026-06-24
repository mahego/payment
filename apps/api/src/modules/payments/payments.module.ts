import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { MikrotikModule } from '../mikrotik/mikrotik.module';
import { NetworkActionsModule } from '../network-actions/network-actions.module';

@Module({
  imports: [PrismaModule, MikrotikModule, NetworkActionsModule],
  controllers: [PaymentsController],
  providers: [PaymentsService],
  exports: [PaymentsService],
})
export class PaymentsModule {}

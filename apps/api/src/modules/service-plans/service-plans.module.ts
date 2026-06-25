import { Module } from '@nestjs/common';
import { ServicePlansService } from './service-plans.service';
import { ServicePlansController } from './service-plans.controller';

@Module({
  controllers: [ServicePlansController],
  providers: [ServicePlansService],
  exports: [ServicePlansService],
})
export class ServicePlansModule {}

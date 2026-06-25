import { PartialType } from '@nestjs/swagger';
import { CreateServicePlanDto } from './create-service-plan.dto';

export class UpdateServicePlanDto extends PartialType(CreateServicePlanDto) {}

import { PartialType } from '@nestjs/swagger';
import { CreateMikrotikProfileDto } from './create-profile.dto';

export class UpdateMikrotikProfileDto extends PartialType(CreateMikrotikProfileDto) {}

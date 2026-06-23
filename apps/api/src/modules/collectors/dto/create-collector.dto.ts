import {
  IsString,
  IsOptional,
  IsBoolean,
  IsDecimal,
  MaxLength,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

export class CreateCollectorDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  assignedZone?: string;

  @ApiPropertyOptional({ example: 5000 })
  @IsOptional()
  @Type(() => Number)
  cashLimit?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  canRegisterOfflinePayments?: boolean;
}

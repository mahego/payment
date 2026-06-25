import { IsString, IsOptional, IsNumber, IsEnum, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ServicePlanType } from '@prisma/client';

export class CreateServicePlanDto {
  @ApiProperty({ example: 'Plan 10 Megas' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Plan básico residencial' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ example: '10M/5M' })
  @IsString()
  speed: string;

  @ApiProperty({ example: 350.00 })
  @IsNumber()
  price: number;

  @ApiPropertyOptional({ enum: ServicePlanType, default: ServicePlanType.PPPOE })
  @IsOptional()
  @IsEnum(ServicePlanType)
  planType?: ServicePlanType;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;

  @ApiPropertyOptional({ example: 'zone-cuid-here' })
  @IsOptional()
  @IsString()
  zoneId?: string;
}

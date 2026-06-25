import {
  IsString,
  IsOptional,
  IsEmail,
  IsEnum,
  IsInt,
  Min,
  Max,
  IsDateString,
  IsNumber,
  IsBoolean,
} from 'class-validator';
import { CustomerStatus, NetworkServiceMode } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCustomerDto {
  @ApiProperty({ example: 'Juan' })
  @IsString()
  firstName: string;

  @ApiProperty({ example: 'Pérez' })
  @IsString()
  lastName: string;

  @ApiPropertyOptional({ example: '+525512345678' })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: 'juan.perez@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ example: 'Av. Reforma 123' })
  @IsString()
  addressLine: string;

  @ApiPropertyOptional({ example: 'Centro' })
  @IsOptional()
  @IsString()
  locality?: string;

  @ApiPropertyOptional({ example: 'Guadalajara' })
  @IsOptional()
  @IsString()
  municipality?: string;

  @ApiPropertyOptional({ enum: CustomerStatus, default: CustomerStatus.ACTIVO })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ example: 'juan_pppoe' })
  @IsOptional()
  @IsString()
  pppoeUsername?: string;

  @ApiPropertyOptional({ example: 'pppoe_password' })
  @IsOptional()
  @IsString()
  pppoePassword?: string;

  @ApiPropertyOptional({ example: '192.168.10.50' })
  @IsOptional()
  @IsString()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 150.0 })
  @IsOptional()
  @IsNumber()
  currentBalance?: number;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  @IsDateString()
  signupDate: string;

  @ApiProperty({ example: 5, description: 'Día del mes para corte de facturación' })
  @IsInt()
  @Min(1)
  @Max(28)
  billingCutoffDay: number;

  @ApiPropertyOptional({ example: 'mikrotik-profile-id-123' })
  @IsOptional()
  @IsString()
  mikrotikProfileId?: string;

  @ApiPropertyOptional({ enum: NetworkServiceMode, default: NetworkServiceMode.PPPOE })
  @IsOptional()
  @IsEnum(NetworkServiceMode)
  serviceMode?: NetworkServiceMode;

  @ApiPropertyOptional({ example: 'queue_juan' })
  @IsOptional()
  @IsString()
  simpleQueueName?: string;

  @ApiPropertyOptional({ example: 'juan_hotspot' })
  @IsOptional()
  @IsString()
  hotspotUsername?: string;

  @ApiPropertyOptional({ example: '00:11:22:33:44:55' })
  @IsOptional()
  @IsString()
  macAddress?: string;

  @ApiPropertyOptional({ example: 'suspended' })
  @IsOptional()
  @IsString()
  suspensionAddressList?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isNetworkSuspended?: boolean;

  @ApiPropertyOptional({ example: 'zone-cuid-here' })
  @IsOptional()
  @IsString()
  zoneId?: string;

  @ApiPropertyOptional({ example: 'plan-cuid-here' })
  @IsOptional()
  @IsString()
  planId?: string;
}

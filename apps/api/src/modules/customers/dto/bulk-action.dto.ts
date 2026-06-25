import { IsArray, IsString, IsEnum, IsOptional, IsObject } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { CustomerStatus } from '@prisma/client';

export enum BulkActionType {
  SUSPEND = 'SUSPEND',
  REACTIVATE = 'REACTIVATE',
  CHANGE_STATUS = 'CHANGE_STATUS',
  ASSIGN_ZONE = 'ASSIGN_ZONE',
  ASSIGN_PLAN = 'ASSIGN_PLAN',
}

export class BulkActionPayloadDto {
  @ApiPropertyOptional({ enum: CustomerStatus })
  @IsOptional()
  @IsEnum(CustomerStatus)
  status?: CustomerStatus;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  zoneId?: string | null;

  @ApiPropertyOptional({ type: String, nullable: true })
  @IsOptional()
  @IsString()
  planId?: string | null;
}

export class BulkActionDto {
  @ApiProperty({ type: [String], example: ['id1', 'id2'] })
  @IsArray()
  @IsString({ each: true })
  customerIds: string[];

  @ApiProperty({ enum: BulkActionType })
  @IsEnum(BulkActionType)
  action: BulkActionType;

  @ApiPropertyOptional({ type: BulkActionPayloadDto })
  @IsOptional()
  @IsObject()
  payload?: BulkActionPayloadDto;
}

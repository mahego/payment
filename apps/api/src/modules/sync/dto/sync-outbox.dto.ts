import {
  IsString,
  IsNotEmpty,
  IsObject,
  IsDateString,
  IsOptional,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class OutboxEventDto {
  @ApiProperty({ example: 'event-id-123' })
  @IsString()
  @IsNotEmpty()
  id: string;

  @ApiProperty({ example: 'Payment' })
  @IsString()
  @IsNotEmpty()
  aggregateType: string;

  @ApiProperty({ example: 'payment-id-placeholder' })
  @IsString()
  @IsNotEmpty()
  aggregateId: string;

  @ApiProperty({ example: 'create' })
  @IsString()
  @IsNotEmpty()
  operation: string;

  @ApiProperty({ example: 'Payment-create-123-abc' })
  @IsString()
  @IsNotEmpty()
  clientRequestId: string;

  @ApiProperty({ example: { customerId: 'cust-1', amount: 100, method: 'EFECTIVO' } })
  @IsObject()
  payload: any;

  @ApiProperty({ example: '2026-06-23T00:00:00.000Z' })
  @IsDateString()
  occurredAt: string;

  @ApiPropertyOptional({ example: 'device-uuid-999' })
  @IsOptional()
  @IsString()
  deviceId?: string;
}

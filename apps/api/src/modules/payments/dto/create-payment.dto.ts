import {
  IsString,
  IsNumber,
  IsEnum,
  IsOptional,
  IsDateString,
  Min,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentDto {
  @ApiProperty({ example: 'customer-id-123' })
  @IsString()
  customerId: string;

  @ApiProperty({ enum: PaymentMethod, example: PaymentMethod.EFECTIVO })
  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @ApiProperty({ example: 250.5, description: 'Monto del pago' })
  @IsNumber()
  @Min(0.01)
  amount: number;

  @ApiPropertyOptional({ example: '2026-06-23T00:00:00.000Z' })
  @IsOptional()
  @IsDateString()
  paidAt?: string;

  @ApiPropertyOptional({ example: 'Pago del mes de Junio' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 'Payment-create-1719114300' })
  @IsOptional()
  @IsString()
  clientRequestId?: string;
}

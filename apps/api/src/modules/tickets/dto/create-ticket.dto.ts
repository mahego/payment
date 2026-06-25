import { IsString, IsOptional, IsEnum } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { TicketPriority } from '@prisma/client';

export class CreateTicketDto {
  @ApiProperty({ example: 'customer-cuid-here' })
  @IsString()
  customerId: string;

  @ApiProperty({ example: 'Falla de conexión' })
  @IsString()
  title: string;

  @ApiProperty({ example: 'El cliente reporta que no tiene internet desde hace 2 horas' })
  @IsString()
  description: string;

  @ApiPropertyOptional({ enum: TicketPriority, default: TicketPriority.MEDIUM })
  @IsOptional()
  @IsEnum(TicketPriority)
  priority?: TicketPriority;

  @ApiPropertyOptional({ example: 'technician-user-id' })
  @IsOptional()
  @IsString()
  assignedToId?: string;
}

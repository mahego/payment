import { IsString, IsOptional, IsInt, Min, Max, IsBoolean } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateZoneDto {
  @ApiProperty({ example: 'Zona Norte' })
  @IsString()
  name: string;

  @ApiPropertyOptional({ example: 'Clientes del sector norte' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 5, description: 'Override cut-off day (1-28)' })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(28)
  billingCutoffDay?: number;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

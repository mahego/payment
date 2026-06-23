import {
  IsString,
  IsOptional,
  IsInt,
  IsEnum,
  IsBoolean,
  Min,
  Max,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MikrotikSuspensionType } from '@prisma/client';

export class CreateMikrotikProfileDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty()
  @IsString()
  host: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(65535)
  port?: number;

  @ApiProperty()
  @IsString()
  username: string;

  @ApiProperty()
  @IsString()
  password: string;

  @ApiPropertyOptional({ enum: MikrotikSuspensionType })
  @IsOptional()
  @IsEnum(MikrotikSuspensionType)
  suspensionType?: MikrotikSuspensionType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  pppoeService?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  addressListName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  active?: boolean;
}

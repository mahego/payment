import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';
import { PartialType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
  // All fields are optional via PartialType
}

export class UpdateUserStatusDto {
  @ApiPropertyOptional({ enum: ['ACTIVE', 'INACTIVE', 'BLOCKED'] })
  @IsEnum(['ACTIVE', 'INACTIVE', 'BLOCKED'])
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
}

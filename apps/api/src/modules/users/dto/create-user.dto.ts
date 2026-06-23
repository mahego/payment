import {
  IsEmail,
  IsString,
  IsOptional,
  IsEnum,
  MinLength,
  MaxLength,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Role } from '@prisma/client';

export class CreateUserDto {
  @ApiProperty()
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  name: string;

  @ApiProperty()
  @IsEmail()
  email: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @Matches(/^\+?[0-9]{7,15}$/, { message: 'Invalid phone format' })
  phone?: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/, {
    message: 'Password must contain uppercase, number and special character',
  })
  password: string;

  @ApiPropertyOptional({ enum: Role })
  @IsOptional()
  @IsEnum(Role)
  role?: Role;
}

import {
  IsEmail,
  IsString,
  MinLength,
  MaxLength,
  IsOptional,
  Matches,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'admin@deluxnet.mx' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'S3cur3P@ssw0rd!' })
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  password: string;

  @ApiPropertyOptional({ example: 'iPhone 15' })
  @IsOptional()
  @IsString()
  @MaxLength(100)
  deviceName?: string;
}

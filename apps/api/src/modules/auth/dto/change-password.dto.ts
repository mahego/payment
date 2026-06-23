import { IsString, MinLength, MaxLength, Matches } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ChangePasswordDto {
  @ApiProperty()
  @IsString()
  @MinLength(8)
  currentPassword: string;

  @ApiProperty()
  @IsString()
  @MinLength(8)
  @MaxLength(100)
  @Matches(/(?=.*[A-Z])(?=.*[0-9])(?=.*[^a-zA-Z0-9])/, {
    message: 'Password must contain uppercase, number and special character',
  })
  newPassword: string;
}

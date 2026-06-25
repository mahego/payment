import { IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ example: 'Se revisó el cableado y se reestableció el servicio.' })
  @IsString()
  @MinLength(1)
  body: string;
}

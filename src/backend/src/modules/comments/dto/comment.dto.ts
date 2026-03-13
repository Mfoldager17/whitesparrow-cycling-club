import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateCommentDto {
  @ApiProperty({ example: 'Glæder mig, medbringer snacks!' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}

export class UpdateCommentDto {
  @ApiProperty({ example: 'Opdateret kommentar' })
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  body: string;
}

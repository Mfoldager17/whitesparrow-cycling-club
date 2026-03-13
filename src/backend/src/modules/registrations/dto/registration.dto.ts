import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class CreateRegistrationDto {
  @ApiProperty({ example: 'Kommer lidt sent', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

export class UpdateRegistrationDto {
  @ApiProperty({ example: 'Opdateret note', required: false })
  @IsString()
  @IsOptional()
  note?: string;
}

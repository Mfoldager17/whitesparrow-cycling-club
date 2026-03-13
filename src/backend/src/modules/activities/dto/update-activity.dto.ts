import { PartialType } from '@nestjs/swagger';
import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';
import { CreateActivityDto } from './create-activity.dto';

export class UpdateActivityDto extends PartialType(CreateActivityDto) {}

export class CancelActivityDto {
  @ApiProperty({ example: 'Aflyst grundet dårligt vejr', required: false })
  @IsString()
  @IsOptional()
  cancellationReason?: string;

  @ApiProperty({ default: true })
  @IsBoolean()
  isCancelled: boolean;
}

import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString } from 'class-validator';

export class ActivityQueryDto {
  @ApiProperty({ enum: ['event', 'ride'], required: false })
  @IsEnum(['event', 'ride'])
  @IsOptional()
  type?: 'event' | 'ride';

  @ApiProperty({ enum: ['easy', 'moderate', 'hard', 'extreme'], required: false })
  @IsEnum(['easy', 'moderate', 'hard', 'extreme'])
  @IsOptional()
  difficulty?: string;

  @ApiProperty({ required: false, description: 'Include past activities' })
  @IsOptional()
  includePast?: boolean;

  @ApiProperty({ required: false, description: 'Include cancelled activities' })
  @IsOptional()
  includeCancelled?: boolean;
}

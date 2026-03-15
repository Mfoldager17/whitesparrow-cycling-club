import { ApiProperty } from '@nestjs/swagger';
import {
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
  MinLength,
} from 'class-validator';

export type ActivityType = 'event' | 'ride';
export type DifficultyLevel = 'easy' | 'moderate' | 'hard' | 'extreme';

export class CreateActivityDto {
  @ApiProperty({ enum: ['event', 'ride'] })
  @IsEnum(['event', 'ride'])
  type: ActivityType;

  @ApiProperty({ example: 'Søndagstur til Dyrehaven' })
  @IsString()
  @MinLength(3)
  title: string;

  @ApiProperty({ example: 'En hyggelig tur...', required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ example: '2026-04-12T09:00:00Z' })
  @IsDateString()
  startsAt: string;

  @ApiProperty({ example: '2026-04-12T13:00:00Z', required: false })
  @IsDateString()
  @IsOptional()
  endsAt?: string;

  @ApiProperty({ example: 'Dyrehaven parkeringsplads, Klampenborg', required: false })
  @IsString()
  @IsOptional()
  startLocation?: string;

  @ApiProperty({ example: 55.7731, required: false })
  @IsOptional()
  startLat?: number;

  @ApiProperty({ example: 12.5775, required: false })
  @IsOptional()
  startLng?: number;

  @ApiProperty({ example: 45, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  approxKm?: number;

  @ApiProperty({ enum: ['easy', 'moderate', 'hard', 'extreme'], required: false })
  @IsEnum(['easy', 'moderate', 'hard', 'extreme'])
  @IsOptional()
  difficulty?: DifficultyLevel;

  @ApiProperty({ example: 20, required: false })
  @IsInt()
  @Min(1)
  @IsOptional()
  maxParticipants?: number;

  @ApiProperty({ example: 'https://www.komoot.com/tour/123', required: false })
  @IsUrl()
  @IsOptional()
  routeUrl?: string;

  @ApiProperty({ type: 'string', example: 'uuid-of-saved-route', required: false, nullable: true })
  @IsUUID()
  @IsOptional()
  savedRouteId?: string | null;
}

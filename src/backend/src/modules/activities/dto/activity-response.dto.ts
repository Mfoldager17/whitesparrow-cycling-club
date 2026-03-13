import { ApiProperty } from '@nestjs/swagger';

export class ActivityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['event', 'ride'] }) type: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true }) description: string | null;
  @ApiProperty() startsAt: Date;
  @ApiProperty({ nullable: true }) endsAt: Date | null;
  @ApiProperty({ nullable: true }) startLocation: string | null;
  @ApiProperty({ nullable: true }) startLat: number | null;
  @ApiProperty({ nullable: true }) startLng: number | null;
  @ApiProperty({ nullable: true }) approxKm: number | null;
  @ApiProperty({ enum: ['easy', 'moderate', 'hard', 'extreme'], nullable: true }) difficulty: string | null;
  @ApiProperty({ nullable: true }) maxParticipants: number | null;
  @ApiProperty({ nullable: true }) routeUrl: string | null;
  @ApiProperty() isCancelled: boolean;
  @ApiProperty({ nullable: true }) cancellationReason: string | null;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ActivityWithStatsDto extends ActivityResponseDto {
  @ApiProperty() organizerName: string;
  @ApiProperty() registeredCount: number;
  @ApiProperty() waitlistCount: number;
}

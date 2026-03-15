import { ApiProperty } from '@nestjs/swagger';
import { RouteDataDto } from './route-response.dto';
import { SavedRouteDto } from '../../routes/dto/route.dto';

export class ActivityResponseDto {
  @ApiProperty() id: string;
  @ApiProperty({ enum: ['event', 'ride'] }) type: string;
  @ApiProperty() title: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty() startsAt: Date;
  @ApiProperty({ nullable: true, type: String }) endsAt: Date | null;
  @ApiProperty({ nullable: true, type: String }) startLocation: string | null;
  @ApiProperty({ nullable: true, type: Number }) startLat: number | null;
  @ApiProperty({ nullable: true, type: Number }) startLng: number | null;
  @ApiProperty({ nullable: true, type: Number }) approxKm: number | null;
  @ApiProperty({ enum: ['easy', 'moderate', 'hard', 'extreme'], nullable: true }) difficulty: string | null;
  @ApiProperty({ nullable: true, type: Number }) maxParticipants: number | null;
  @ApiProperty({ nullable: true, type: String }) routeUrl: string | null;
  @ApiProperty({ nullable: true, type: String }) savedRouteId: string | null;
  @ApiProperty() isCancelled: boolean;
  @ApiProperty({ nullable: true, type: String }) cancellationReason: string | null;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class ActivityWithStatsDto extends ActivityResponseDto {
  @ApiProperty() organizerName: string;
  @ApiProperty() registeredCount: number;
  @ApiProperty() waitlistCount: number;
  @ApiProperty({ type: RouteDataDto, nullable: true }) routeData: RouteDataDto | null;
  @ApiProperty({ type: SavedRouteDto, nullable: true }) savedRoute: SavedRouteDto | null;
}

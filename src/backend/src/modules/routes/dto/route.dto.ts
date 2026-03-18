import { ApiProperty } from '@nestjs/swagger';
import {
  IsArray,
  IsEnum,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export type RouteSurface = 'paved' | 'unpaved' | 'auto';

export class WaypointDto {
  @ApiProperty({ example: 55.6761 })
  @IsNumber()
  lat: number;

  @ApiProperty({ example: 12.5683 })
  @IsNumber()
  lng: number;
}

export class SnapWaypointDto extends WaypointDto {
  @ApiProperty({ enum: ['paved', 'unpaved', 'auto'], example: 'auto' })
  @IsEnum(['paved', 'unpaved', 'auto'])
  surface: RouteSurface;
}

export class PlanRouteDto {
  @ApiProperty({ enum: ['paved', 'unpaved', 'auto'], example: 'auto' })
  @IsEnum(['paved', 'unpaved', 'auto'])
  surface: RouteSurface;

  @ApiProperty({ type: [WaypointDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => WaypointDto)
  waypoints: WaypointDto[];
}

export class CreateRouteDto extends PlanRouteDto {
  @ApiProperty({ example: 'Søndagstur via Dyrehaven' })
  @IsString()
  @MinLength(2)
  name: string;

  @ApiProperty({ example: 'En hyggelig tur langs kysten', required: false })
  @IsString()
  @IsOptional()
  description?: string;
}

export class UpdateRouteDto {
  @ApiProperty({ required: false })
  @IsString()
  @MinLength(2)
  @IsOptional()
  name?: string;

  @ApiProperty({ required: false })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({ type: [WaypointDto], required: false })
  @IsOptional()
  waypoints?: WaypointDto[];

  @ApiProperty({ enum: ['auto', 'paved', 'unpaved'], required: false })
  @IsOptional()
  surface?: RouteSurface;
}

// ─── Response shapes ─────────────────────────────────────────────────────────

export class RouteTrackPointDto {
  @ApiProperty() lat: number;
  @ApiProperty() lng: number;
  @ApiProperty() ele: number;
  @ApiProperty() distanceKm: number;
}

export class RouteBoundingBoxDto {
  @ApiProperty() minLat: number;
  @ApiProperty() maxLat: number;
  @ApiProperty() minLng: number;
  @ApiProperty() maxLng: number;
}

export class PlannedRouteDto {
  @ApiProperty() totalDistanceKm: number;
  @ApiProperty() elevationGainM: number;
  @ApiProperty() elevationLossM: number;
  @ApiProperty() maxElevationM: number;
  @ApiProperty() minElevationM: number;
  @ApiProperty({ type: [RouteTrackPointDto] }) trackPoints: RouteTrackPointDto[];
  @ApiProperty({ type: RouteBoundingBoxDto }) boundingBox: RouteBoundingBoxDto;
  @ApiProperty({ type: [WaypointDto] }) waypoints: WaypointDto[];
  @ApiProperty({ enum: ['paved', 'unpaved', 'auto'] }) surface: RouteSurface;
}

export class SavedRouteDto extends PlannedRouteDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: Date;
  @ApiProperty() updatedAt: Date;
}

export class SavedRouteSummaryDto {
  @ApiProperty() id: string;
  @ApiProperty() name: string;
  @ApiProperty({ nullable: true, type: String }) description: string | null;
  @ApiProperty({ enum: ['paved', 'unpaved', 'auto'] }) surface: RouteSurface;
  @ApiProperty() totalDistanceKm: number;
  @ApiProperty() elevationGainM: number;
  @ApiProperty() elevationLossM: number;
  @ApiProperty() createdBy: string;
  @ApiProperty() createdAt: Date;
}

// ─── DTO for linking a saved route to an activity ─────────────────────────────

export class LinkRouteDto {
  @ApiProperty({ nullable: true, type: String })
  @IsUUID()
  @IsOptional()
  savedRouteId: string | null;
}

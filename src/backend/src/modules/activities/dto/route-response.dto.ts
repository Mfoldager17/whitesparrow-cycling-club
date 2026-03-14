import { ApiProperty } from '@nestjs/swagger';

export class TrackPointDto {
  @ApiProperty() lat: number;
  @ApiProperty() lng: number;
  @ApiProperty() ele: number;
  @ApiProperty() distanceKm: number;
}

export class BoundingBoxDto {
  @ApiProperty() minLat: number;
  @ApiProperty() maxLat: number;
  @ApiProperty() minLng: number;
  @ApiProperty() maxLng: number;
}

export class RouteDataDto {
  @ApiProperty() id: string;
  @ApiProperty() totalDistanceKm: number;
  @ApiProperty() elevationGainM: number;
  @ApiProperty() elevationLossM: number;
  @ApiProperty() maxElevationM: number;
  @ApiProperty() minElevationM: number;
  @ApiProperty({ type: [TrackPointDto] }) trackPoints: TrackPointDto[];
  @ApiProperty({ type: BoundingBoxDto }) boundingBox: BoundingBoxDto;
}

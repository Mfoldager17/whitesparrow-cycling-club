import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { GpxService } from '../activities/gpx.service';
import {
  CreateRouteDto,
  PlanRouteDto,
  PlannedRouteDto,
  RouteSurface,
  SavedRouteDto,
  SavedRouteSummaryDto,
  SnapWaypointDto,
  UpdateRouteDto,
  WaypointDto,
} from './dto/route.dto';

interface TrackPoint {
  lat: number;
  lng: number;
  ele: number;
  distanceKm: number;
}

interface BoundingBox {
  minLat: number;
  maxLat: number;
  minLng: number;
  maxLng: number;
}

function haversine(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function sampleArray<T>(arr: T[], maxPoints: number): T[] {
  if (arr.length <= maxPoints) return arr;
  const step = (arr.length - 1) / (maxPoints - 1);
  return Array.from({ length: maxPoints }, (_, i) => arr[Math.round(i * step)]);
}

@Injectable()
export class RoutesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly gpx: GpxService,
  ) {}

  // ─── ORS profile mapping ──────────────────────────────────────────────────

  private orsProfile(surface: RouteSurface): string {
    if (surface === 'unpaved') return 'cycling-mountain';
    // 'paved' and 'auto' both use cycling-road: routes along regular roads
    // where cycling is permitted, rather than seeking dedicated cycling paths.
    return 'cycling-road';
  }

  // ─── Call OpenRouteService to get a cycling route ─────────────────────────

  private async callOrs(waypoints: WaypointDto[], surface: RouteSurface): Promise<TrackPoint[]> {
    const apiKey = this.config.get<string>('ORS_API_KEY');
    if (!apiKey) {
      throw new ServiceUnavailableException(
        'ORS_API_KEY is not configured. Get a free key at https://openrouteservice.org/ and set it in .env',
      );
    }

    const profile = this.orsProfile(surface);
    const coordinates = waypoints.map((w) => [w.lng, w.lat]);

    const res = await fetch(
      `https://api.openrouteservice.org/v2/directions/${profile}/geojson`,
      {
        method: 'POST',
        headers: {
          Authorization: apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ coordinates, elevation: true, instructions: false }),
      },
    );

    if (!res.ok) {
      const text = await res.text();
      throw new BadRequestException(`ORS routing failed (${res.status}): ${text}`);
    }

    const data = (await res.json()) as {
      features: Array<{
        geometry: { coordinates: number[][] };
      }>;
    };

    const coords = data.features[0]?.geometry?.coordinates ?? [];
    if (coords.length === 0) throw new BadRequestException('ORS returned an empty route');

    // ORS elevation-aware coordinates are [lng, lat, elevation_m]
    const rawPoints = coords.map(([lng, lat, ele = 0]) => ({ lat, lng, ele }));

    let distKm = 0;
    const trackPoints: TrackPoint[] = rawPoints.map((p, i) => {
      if (i > 0) {
        distKm += haversine(rawPoints[i - 1].lat, rawPoints[i - 1].lng, p.lat, p.lng);
      }
      return {
        lat: Math.round(p.lat * 1e6) / 1e6,
        lng: Math.round(p.lng * 1e6) / 1e6,
        ele: Math.round(p.ele * 10) / 10,
        distanceKm: Math.round(distKm * 1000) / 1000,
      };
    });

    return sampleArray(trackPoints, 2000);
  }

  // ─── Compute elevation + bounding-box stats from track points ────────────

  private computeStats(trackPoints: TrackPoint[]): {
    totalDistanceKm: number;
    elevationGainM: number;
    elevationLossM: number;
    maxElevationM: number;
    minElevationM: number;
    boundingBox: BoundingBox;
  } {
    let gain = 0;
    let loss = 0;
    for (let i = 1; i < trackPoints.length; i++) {
      const diff = trackPoints[i].ele - trackPoints[i - 1].ele;
      if (diff > 0) gain += diff;
      else loss -= diff;
    }
    const lats = trackPoints.map((p) => p.lat);
    const lngs = trackPoints.map((p) => p.lng);
    const eles = trackPoints.map((p) => p.ele);
    return {
      totalDistanceKm: Math.round(trackPoints[trackPoints.length - 1].distanceKm * 10) / 10,
      elevationGainM: Math.round(gain),
      elevationLossM: Math.round(loss),
      maxElevationM: Math.round(Math.max(...eles)),
      minElevationM: Math.round(Math.min(...eles)),
      boundingBox: {
        minLat: Math.min(...lats),
        maxLat: Math.max(...lats),
        minLng: Math.min(...lngs),
        maxLng: Math.max(...lngs),
      },
    };
  }

  // ─── Public API ───────────────────────────────────────────────────────────

  /** Snap a coordinate to the nearest road/path for the given surface type */
  async snap(dto: SnapWaypointDto): Promise<WaypointDto> {
    const apiKey = this.config.get<string>('ORS_API_KEY');
    if (!apiKey) return { lat: dto.lat, lng: dto.lng };

    const profile = this.orsProfile(dto.surface);
    try {
      const res = await fetch(
        `https://api.openrouteservice.org/v2/snap/${profile}`,
        {
          method: 'POST',
          headers: { Authorization: apiKey, 'Content-Type': 'application/json' },
          body: JSON.stringify({ locations: [[dto.lng, dto.lat]], radius: 500 }),
        },
      );
      if (!res.ok) return { lat: dto.lat, lng: dto.lng };
      const data = (await res.json()) as {
        locations: Array<{ location: [number, number] } | null>;
      };
      const snapped = data.locations?.[0];
      if (!snapped) return { lat: dto.lat, lng: dto.lng };
      return { lat: snapped.location[1], lng: snapped.location[0] };
    } catch {
      return { lat: dto.lat, lng: dto.lng };
    }
  }

  async plan(dto: PlanRouteDto): Promise<PlannedRouteDto> {
    if (dto.waypoints.length < 2)
      throw new BadRequestException('Mindst 2 waypoints er påkrævet');
    const trackPoints = await this.callOrs(dto.waypoints, dto.surface);
    const stats = this.computeStats(trackPoints);
    return { ...stats, trackPoints, waypoints: dto.waypoints, surface: dto.surface };
  }

  async create(user: User, dto: CreateRouteDto): Promise<SavedRouteDto> {
    if (dto.waypoints.length < 2)
      throw new BadRequestException('Mindst 2 waypoints er påkrævet');
    const trackPoints = await this.callOrs(dto.waypoints, dto.surface);
    const stats = this.computeStats(trackPoints);

    const route = await this.prisma.savedRoute.create({
      data: {
        createdBy: user.id,
        name: dto.name,
        description: dto.description ?? null,
        surface: dto.surface,
        /* eslint-disable @typescript-eslint/no-explicit-any */
        waypoints: dto.waypoints as any,
        trackPoints: trackPoints as any,
        boundingBox: stats.boundingBox as any,
        /* eslint-enable @typescript-eslint/no-explicit-any */
        totalDistanceKm: stats.totalDistanceKm,
        elevationGainM: stats.elevationGainM,
        elevationLossM: stats.elevationLossM,
        maxElevationM: stats.maxElevationM,
        minElevationM: stats.minElevationM,
      },
    });

    return this.toDetailDto(route, trackPoints);
  }

  async findAll(): Promise<SavedRouteSummaryDto[]> {
    const routes = await this.prisma.savedRoute.findMany({ orderBy: { createdAt: 'desc' } });
    return routes.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description,
      surface: r.surface as RouteSurface,
      totalDistanceKm: r.totalDistanceKm,
      elevationGainM: r.elevationGainM,
      elevationLossM: r.elevationLossM,
      createdBy: r.createdBy,
      createdAt: r.createdAt,
    }));
  }

  async findOne(id: string): Promise<SavedRouteDto> {
    const r = await this.prisma.savedRoute.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rute ikke fundet');
    return this.toDetailDto(r, r.trackPoints as unknown as TrackPoint[]);
  }

  async update(user: User, id: string, dto: UpdateRouteDto): Promise<SavedRouteDto> {
    const r = await this.prisma.savedRoute.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rute ikke fundet');
    if (r.createdBy !== user.id && user.role !== 'admin')
      throw new ForbiddenException('Kun ejeren eller en admin kan redigere denne rute');

    const updated = await this.prisma.savedRoute.update({ where: { id }, data: dto });
    return this.toDetailDto(updated, updated.trackPoints as unknown as TrackPoint[]);
  }

  async delete(user: User, id: string): Promise<void> {
    const r = await this.prisma.savedRoute.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rute ikke fundet');
    if (r.createdBy !== user.id && user.role !== 'admin')
      throw new ForbiddenException('Kun ejeren eller en admin kan slette denne rute');

    await this.prisma.savedRoute.delete({ where: { id } });
  }

  async exportGpx(id: string): Promise<{ name: string; buffer: Buffer }> {
    const r = await this.prisma.savedRoute.findUnique({ where: { id } });
    if (!r) throw new NotFoundException('Rute ikke fundet');
    const trackPoints = r.trackPoints as unknown as TrackPoint[];
    const buffer = this.gpx.generate(r.name, trackPoints);
    return { name: r.name, buffer };
  }

  // ─── Helpers ──────────────────────────────────────────────────────────────

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toDetailDto(r: any, trackPoints: TrackPoint[]): SavedRouteDto {
    return {
      id: r.id,
      name: r.name,
      description: r.description,
      surface: r.surface as RouteSurface,
      waypoints: r.waypoints as unknown as WaypointDto[],
      totalDistanceKm: r.totalDistanceKm,
      elevationGainM: r.elevationGainM,
      elevationLossM: r.elevationLossM,
      maxElevationM: r.maxElevationM,
      minElevationM: r.minElevationM,
      trackPoints,
      boundingBox: r.boundingBox as unknown as { minLat: number; maxLat: number; minLng: number; maxLng: number },
      createdBy: r.createdBy,
      createdAt: r.createdAt,
      updatedAt: r.updatedAt,
    };
  }
}

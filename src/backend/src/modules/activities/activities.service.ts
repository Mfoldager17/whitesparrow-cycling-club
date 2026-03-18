import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Activity, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { StorageService } from '../storage/storage.service';
import { GpxService } from './gpx.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CancelActivityDto, UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ActivityResponseDto, ActivityWithStatsDto } from './dto/activity-response.dto';
import { RouteDataDto } from './dto/route-response.dto';

@Injectable()
export class ActivitiesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly gpx: GpxService,
  ) {}

  private toDto(activity: Activity): ActivityResponseDto {
    return {
      id: activity.id,
      type: activity.type,
      title: activity.title,
      description: activity.description,
      startsAt: activity.startsAt,
      endsAt: activity.endsAt,
      startLocation: activity.startLocation,
      startLat: activity.startLat ? Number(activity.startLat) : null,
      startLng: activity.startLng ? Number(activity.startLng) : null,
      approxKm: activity.approxKm,
      difficulty: activity.difficulty,
      maxParticipants: activity.maxParticipants,
      routeUrl: activity.routeUrl,
      savedRouteId: activity.savedRouteId ?? null,
      isCancelled: activity.isCancelled,
      cancellationReason: activity.cancellationReason,
      createdBy: activity.createdBy,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
    };
  }

  private toRouteDto(routeData: {
    id: string;
    totalDistanceKm: number;
    elevationGainM: number;
    elevationLossM: number;
    maxElevationM: number;
    minElevationM: number;
    trackPoints: unknown;
    boundingBox: unknown;
  }): RouteDataDto {
    return {
      id: routeData.id,
      totalDistanceKm: routeData.totalDistanceKm,
      elevationGainM: routeData.elevationGainM,
      elevationLossM: routeData.elevationLossM,
      maxElevationM: routeData.maxElevationM,
      minElevationM: routeData.minElevationM,
      trackPoints: routeData.trackPoints as RouteDataDto['trackPoints'],
      boundingBox: routeData.boundingBox as RouteDataDto['boundingBox'],
    };
  }

  async findAll(query: ActivityQueryDto): Promise<ActivityWithStatsDto[]> {
    const where: Record<string, unknown> = {};

    if (query.type) where.type = query.type;
    if (query.difficulty) where.difficulty = query.difficulty;
    if (!query.includePast) where.startsAt = { gt: new Date() };
    if (!query.includeCancelled) where.isCancelled = false;

    const activities = await this.prisma.activity.findMany({
      where,
      orderBy: { startsAt: 'asc' },
      include: {
        creator: { select: { fullName: true } },
        registrations: { select: { status: true } },
      },
    });

    return activities.map((a) => ({
      ...this.toDto(a),
      organizerName: a.creator.fullName,
      registeredCount: a.registrations.filter((r) => r.status === 'registered').length,
      waitlistCount: a.registrations.filter((r) => r.status === 'waitlisted').length,
      routeData: null,
      savedRoute: null,
    }));
  }

  async findOne(id: string): Promise<ActivityWithStatsDto> {
    const a = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        creator: { select: { fullName: true } },
        registrations: { select: { status: true } },
        routeData: true,
        savedRoute: true,
      },
    });
    if (!a) throw new NotFoundException('Activity not found');

    let savedRouteData: ActivityWithStatsDto['savedRoute'] = null;
    if (a.savedRoute) {
      const sr = a.savedRoute;
      savedRouteData = {
        id: sr.id,
        name: sr.name,
        description: sr.description,
        surface: sr.surface as any,
        waypoints: sr.waypoints as any,
        totalDistanceKm: sr.totalDistanceKm,
        elevationGainM: sr.elevationGainM,
        elevationLossM: sr.elevationLossM,
        maxElevationM: sr.maxElevationM,
        minElevationM: sr.minElevationM,
        trackPoints: sr.trackPoints as any,
        boundingBox: sr.boundingBox as any,
        createdBy: sr.createdBy,
        createdAt: sr.createdAt,
        updatedAt: sr.updatedAt,
      };
    }

    return {
      ...this.toDto(a),
      organizerName: a.creator.fullName,
      registeredCount: a.registrations.filter((r) => r.status === 'registered').length,
      waitlistCount: a.registrations.filter((r) => r.status === 'waitlisted').length,
      routeData: a.routeData ? this.toRouteDto(a.routeData) : null,
      savedRoute: savedRouteData,
    };
  }

  async create(user: User, dto: CreateActivityDto): Promise<ActivityResponseDto> {
    // Only admins may create club events
    if (dto.type === 'event' && user.role !== UserRole.admin) {
      throw new ForbiddenException('Only admins can create club events');
    }

    const activity = await this.prisma.activity.create({
      data: {
        createdBy: user.id,
        type: dto.type,
        title: dto.title,
        description: dto.description ?? null,
        startsAt: new Date(dto.startsAt),
        endsAt: dto.endsAt ? new Date(dto.endsAt) : null,
        startLocation: dto.startLocation ?? null,
        startLat: dto.startLat ?? null,
        startLng: dto.startLng ?? null,
        approxKm: dto.approxKm ?? null,
        difficulty: dto.difficulty ?? null,
        maxParticipants: dto.maxParticipants ?? null,
        routeUrl: dto.routeUrl ?? null,
        savedRouteId: dto.savedRouteId ?? null,
      },
    });

    // Auto-register the creator
    await this.prisma.registration.create({
      data: {
        activityId: activity.id,
        userId: user.id,
        status: 'registered',
        note: null,
      },
    });

    return this.toDto(activity);
  }

  async update(
    user: User,
    id: string,
    dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Activity not found');

    if (activity.createdBy !== user.id && user.role !== UserRole.admin) {
      throw new ForbiddenException('Not allowed to edit this activity');
    }

    // When linking a saved route, clear any previously uploaded GPX route data
    if (dto.savedRouteId !== undefined && dto.savedRouteId !== null) {
      const existing = await this.prisma.routeData.findUnique({ where: { activityId: id } });
      if (existing) {
        await this.storage.delete(existing.gpxFileKey).catch(() => {});
        await this.prisma.routeData.delete({ where: { activityId: id } });
      }
    }

    const updated = await this.prisma.activity.update({
      where: { id },
      data: {
        ...(dto.title && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.startsAt && { startsAt: new Date(dto.startsAt) }),
        ...(dto.endsAt !== undefined && { endsAt: dto.endsAt ? new Date(dto.endsAt) : null }),
        ...(dto.startLocation !== undefined && { startLocation: dto.startLocation }),
        ...(dto.startLat !== undefined && { startLat: dto.startLat }),
        ...(dto.startLng !== undefined && { startLng: dto.startLng }),
        ...(dto.approxKm !== undefined && { approxKm: dto.approxKm }),
        ...(dto.difficulty !== undefined && { difficulty: dto.difficulty }),
        ...(dto.maxParticipants !== undefined && { maxParticipants: dto.maxParticipants }),
        ...(dto.routeUrl !== undefined && { routeUrl: dto.routeUrl }),
        ...(dto.savedRouteId !== undefined && { savedRouteId: dto.savedRouteId ?? null }),
      },
    });

    return this.toDto(updated);
  }

  async cancel(
    user: User,
    id: string,
    dto: CancelActivityDto,
  ): Promise<ActivityResponseDto> {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Activity not found');

    if (activity.createdBy !== user.id && user.role !== UserRole.admin) {
      throw new ForbiddenException('Not allowed to cancel this activity');
    }

    if (!dto.isCancelled) {
      throw new BadRequestException('isCancelled must be true to cancel an activity');
    }

    const updated = await this.prisma.activity.update({
      where: { id },
      data: {
        isCancelled: true,
        cancellationReason: dto.cancellationReason ?? null,
      },
    });

    return this.toDto(updated);
  }

  async delete(user: User, id: string): Promise<void> {
    const activity = await this.prisma.activity.findUnique({ where: { id } });
    if (!activity) throw new NotFoundException('Activity not found');

    if (activity.createdBy !== user.id && user.role !== UserRole.admin) {
      throw new ForbiddenException('Not allowed to delete this activity');
    }

    // Count registrations by others (creator's own registration doesn't count)
    const othersCount = await this.prisma.registration.count({
      where: { activityId: id, userId: { not: user.id }, status: { not: 'cancelled' } },
    });

    if (othersCount > 0 && user.role !== UserRole.admin) {
      throw new BadRequestException('Cannot delete an activity that other participants have joined');
    }

    await this.prisma.activity.delete({ where: { id } });
  }

  async uploadRoute(user: User, activityId: string, file: Express.Multer.File): Promise<RouteDataDto> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    if (activity.createdBy !== user.id && user.role !== UserRole.admin) {
      throw new ForbiddenException('Not allowed to upload route for this activity');
    }

    const parsed = this.gpx.parse(file.buffer);

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const gpxFileKey = `routes/${activityId}/${timestamp}.gpx`;
    await this.storage.upload(gpxFileKey, file.buffer, 'application/gpx+xml');

    // Delete any previous route data for this activity
    const existing = await this.prisma.routeData.findUnique({ where: { activityId } });
    if (existing) {
      await this.storage.delete(existing.gpxFileKey).catch(() => {});
      await this.prisma.routeData.delete({ where: { activityId } });
    }

    const routeData = await this.prisma.routeData.create({
      data: {
        activityId,
        gpxFileKey,
        totalDistanceKm: parsed.totalDistanceKm,
        elevationGainM: parsed.elevationGainM,
        elevationLossM: parsed.elevationLossM,
        maxElevationM: parsed.maxElevationM,
        minElevationM: parsed.minElevationM,
        trackPoints: parsed.trackPoints as object[],
        boundingBox: parsed.boundingBox as object,
      },
    });

    return this.toRouteDto(routeData);
  }

  async deleteRoute(user: User, activityId: string): Promise<void> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    if (activity.createdBy !== user.id && user.role !== UserRole.admin) {
      throw new ForbiddenException('Not allowed to delete route for this activity');
    }

    const routeData = await this.prisma.routeData.findUnique({ where: { activityId } });
    if (!routeData) throw new NotFoundException('No route data found for this activity');

    await this.storage.delete(routeData.gpxFileKey).catch(() => {});
    await this.prisma.routeData.delete({ where: { activityId } });
  }

  async downloadRoute(activityId: string): Promise<string> {
    const routeData = await this.prisma.routeData.findUnique({ where: { activityId } });
    if (!routeData) throw new NotFoundException('No route data found for this activity');
    return this.storage.getPresignedUrl(routeData.gpxFileKey, 600);
  }
}

import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Activity, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CancelActivityDto, UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ActivityResponseDto, ActivityWithStatsDto } from './dto/activity-response.dto';

@Injectable()
export class ActivitiesService {
  constructor(private readonly prisma: PrismaService) {}

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
      isCancelled: activity.isCancelled,
      cancellationReason: activity.cancellationReason,
      createdBy: activity.createdBy,
      createdAt: activity.createdAt,
      updatedAt: activity.updatedAt,
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
    }));
  }

  async findOne(id: string): Promise<ActivityWithStatsDto> {
    const a = await this.prisma.activity.findUnique({
      where: { id },
      include: {
        creator: { select: { fullName: true } },
        registrations: { select: { status: true } },
      },
    });
    if (!a) throw new NotFoundException('Activity not found');

    return {
      ...this.toDto(a),
      organizerName: a.creator.fullName,
      registeredCount: a.registrations.filter((r) => r.status === 'registered').length,
      waitlistCount: a.registrations.filter((r) => r.status === 'waitlisted').length,
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
}

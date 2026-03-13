import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Registration, User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateRegistrationDto, UpdateRegistrationDto } from './dto/registration.dto';
import { RegistrationResponseDto } from './dto/registration-response.dto';

@Injectable()
export class RegistrationsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(reg: Registration): RegistrationResponseDto {
    return {
      id: reg.id,
      activityId: reg.activityId,
      userId: reg.userId,
      status: reg.status,
      note: reg.note,
      registeredAt: reg.registeredAt,
    };
  }

  async getForActivity(activityId: string): Promise<RegistrationResponseDto[]> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    const regs = await this.prisma.registration.findMany({
      where: { activityId },
      orderBy: { registeredAt: 'asc' },
      include: { user: { select: { fullName: true, email: true } } },
    });
    return regs.map((r) => ({
      id: r.id,
      activityId: r.activityId,
      userId: r.userId,
      status: r.status,
      note: r.note,
      registeredAt: r.registeredAt,
      userName: r.user.fullName,
      userEmail: r.user.email,
    }));
  }

  async getMyRegistrations(userId: string): Promise<RegistrationResponseDto[]> {
    const regs = await this.prisma.registration.findMany({
      where: { userId },
      orderBy: { registeredAt: 'desc' },
      include: { activity: true },
    });
    return regs.map((r) => ({
      id: r.id,
      activityId: r.activityId,
      userId: r.userId,
      status: r.status,
      note: r.note,
      registeredAt: r.registeredAt,
      title: r.activity.title,
      type: r.activity.type,
      startsAt: r.activity.startsAt,
      startLocation: r.activity.startLocation,
      approxKm: r.activity.approxKm,
      difficulty: r.activity.difficulty,
      isCancelled: r.activity.isCancelled,
      registrationStatus: r.status,
    }));
  }

  async register(
    user: User,
    activityId: string,
    dto: CreateRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');
    if (activity.isCancelled) throw new BadRequestException('Activity is cancelled');
    if (activity.startsAt < new Date()) throw new BadRequestException('Activity has already started');

    const existing = await this.prisma.registration.findUnique({
      where: { uq_one_registration: { activityId, userId: user.id } },
    });
    if (existing && existing.status !== 'cancelled') {
      throw new ConflictException('Already registered for this activity');
    }

    // Determine status — count active registrations
    let status: 'registered' | 'waitlisted' = 'registered';
    if (activity.maxParticipants !== null) {
      const activeCount = await this.prisma.registration.count({
        where: { activityId, status: 'registered' },
      });
      if (activeCount >= activity.maxParticipants) {
        status = 'waitlisted';
      }
    }

    const reg = existing
      ? await this.prisma.registration.update({
          where: { id: existing.id },
          data: { status, note: dto.note ?? null },
        })
      : await this.prisma.registration.create({
          data: { activityId, userId: user.id, status, note: dto.note ?? null },
        });

    return this.toDto(reg);
  }

  async update(
    user: User,
    activityId: string,
    dto: UpdateRegistrationDto,
  ): Promise<RegistrationResponseDto> {
    const reg = await this.prisma.registration.findUnique({
      where: { uq_one_registration: { activityId, userId: user.id } },
    });
    if (!reg) throw new NotFoundException('Registration not found');

    const updated = await this.prisma.registration.update({
      where: { id: reg.id },
      data: { note: dto.note ?? null },
    });
    return this.toDto(updated);
  }

  async cancel(user: User, activityId: string): Promise<RegistrationResponseDto> {
    const reg = await this.prisma.registration.findUnique({
      where: { uq_one_registration: { activityId, userId: user.id } },
    });
    if (!reg) throw new NotFoundException('Registration not found');
    if (reg.status === 'cancelled') throw new BadRequestException('Already cancelled');

    const wasRegistered = reg.status === 'registered';

    const cancelled = await this.prisma.registration.update({
      where: { id: reg.id },
      data: { status: 'cancelled' },
    });

    // If the user was confirmed, promote the first person on the waitlist
    if (wasRegistered) {
      const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
      if (activity?.maxParticipants !== null) {
        const activeCount = await this.prisma.registration.count({
          where: { activityId, status: 'registered' },
        });
        if (activeCount < (activity?.maxParticipants ?? 0)) {
          const next = await this.prisma.registration.findFirst({
            where: { activityId, status: 'waitlisted' },
            orderBy: { registeredAt: 'asc' },
          });
          if (next) {
            await this.prisma.registration.update({
              where: { id: next.id },
              data: { status: 'registered' },
            });
          }
        }
      }
    }

    return this.toDto(cancelled);
  }
}

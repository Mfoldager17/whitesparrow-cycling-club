import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { User } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { AdminUpdateUserDto, UpdateUserDto } from './dto/update-user.dto';
import { UserResponseDto } from './dto/user-response.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(user: User): UserResponseDto {
    return {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      role: user.role,
      avatarUrl: user.avatarUrl,
      bio: user.bio,
      isActive: user.isActive,
      createdAt: user.createdAt,
    };
  }

  async findAll(): Promise<UserResponseDto[]> {
    const users = await this.prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
    });
    return users.map((u) => this.toDto(u));
  }

  async findOne(id: string): Promise<UserResponseDto> {
    const user = await this.prisma.user.findUnique({ where: { id } });
    if (!user) throw new NotFoundException('User not found');
    return this.toDto(user);
  }

  async updateSelf(
    requestingUser: User,
    targetId: string,
    dto: UpdateUserDto,
  ): Promise<UserResponseDto> {
    if (requestingUser.id !== targetId) {
      throw new ForbiddenException('You can only edit your own profile');
    }
    return this.updateUser(targetId, dto);
  }

  async adminUpdate(id: string, dto: AdminUpdateUserDto): Promise<UserResponseDto> {
    return this.updateUser(id, dto);
  }

  private async updateUser(
    id: string,
    dto: UpdateUserDto | AdminUpdateUserDto,
  ): Promise<UserResponseDto> {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    const user = await this.prisma.user.update({ where: { id }, data: dto });
    return this.toDto(user);
  }

  async deactivate(id: string): Promise<UserResponseDto> {
    const exists = await this.prisma.user.findUnique({ where: { id } });
    if (!exists) throw new NotFoundException('User not found');

    const user = await this.prisma.user.update({
      where: { id },
      data: { isActive: false },
    });
    return this.toDto(user);
  }
}

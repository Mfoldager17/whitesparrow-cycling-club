import {
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Comment, User, UserRole } from '@prisma/client';
import { PrismaService } from '../../database/prisma.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';

type CommentWithUser = Comment & { user: { fullName: string; avatarUrl: string | null } };

@Injectable()
export class CommentsService {
  constructor(private readonly prisma: PrismaService) {}

  private toDto(comment: CommentWithUser): CommentResponseDto {
    return {
      id: comment.id,
      activityId: comment.activityId,
      userId: comment.userId,
      authorName: comment.user.fullName,
      authorAvatarUrl: comment.user.avatarUrl,
      body: comment.body,
      createdAt: comment.createdAt,
      updatedAt: comment.updatedAt,
    };
  }

  async getForActivity(activityId: string): Promise<CommentResponseDto[]> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    const comments = await this.prisma.comment.findMany({
      where: { activityId, isDeleted: false },
      orderBy: { createdAt: 'asc' },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });

    return comments.map((c) => this.toDto(c));
  }

  async create(
    user: User,
    activityId: string,
    dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    const comment = await this.prisma.comment.create({
      data: { activityId, userId: user.id, body: dto.body },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });

    return this.toDto(comment);
  }

  async update(
    user: User,
    id: string,
    dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    const comment = await this.prisma.comment.findUnique({
      where: { id },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment not found');

    if (comment.userId !== user.id) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    const updated = await this.prisma.comment.update({
      where: { id },
      data: { body: dto.body },
      include: { user: { select: { fullName: true, avatarUrl: true } } },
    });

    return this.toDto(updated);
  }

  async remove(user: User, id: string): Promise<void> {
    const comment = await this.prisma.comment.findUnique({ where: { id } });
    if (!comment || comment.isDeleted) throw new NotFoundException('Comment not found');

    if (comment.userId !== user.id && user.role !== UserRole.admin) {
      throw new ForbiddenException('Not allowed to delete this comment');
    }

    await this.prisma.comment.update({ where: { id }, data: { isDeleted: true } });
  }
}

import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiParam, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { CommentsService } from './comments.service';
import { CreateCommentDto, UpdateCommentDto } from './dto/comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities/:activityId/comments')
export class CommentsController {
  constructor(private readonly commentsService: CommentsService) {}

  @Get()
  @ApiParam({ name: 'activityId', type: String })
  @ApiOperation({ summary: 'List comments for an activity' })
  @ApiResponse({ status: 200, type: [CommentResponseDto] })
  getForActivity(
    @Param('activityId', ParseUUIDPipe) activityId: string,
  ): Promise<CommentResponseDto[]> {
    return this.commentsService.getForActivity(activityId);
  }

  @Post()
  @ApiParam({ name: 'activityId', type: String })
  @ApiOperation({ summary: 'Post a comment on an activity' })
  @ApiResponse({ status: 201, type: CommentResponseDto })
  create(
    @CurrentUser() user: User,
    @Param('activityId', ParseUUIDPipe) activityId: string,
    @Body() dto: CreateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentsService.create(user, activityId, dto);
  }

  @Patch(':id')
  @ApiParam({ name: 'activityId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Edit a comment' })
  @ApiResponse({ status: 200, type: CommentResponseDto })
  update(
    @CurrentUser() user: User,
    @Param('activityId', ParseUUIDPipe) _activityId: string,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateCommentDto,
  ): Promise<CommentResponseDto> {
    return this.commentsService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiParam({ name: 'activityId', type: String })
  @ApiParam({ name: 'id', type: String })
  @ApiOperation({ summary: 'Delete (soft) a comment' })
  @ApiResponse({ status: 204 })
  remove(
    @CurrentUser() user: User,
    @Param('activityId', ParseUUIDPipe) _activityId: string,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.commentsService.remove(user, id);
  }
}

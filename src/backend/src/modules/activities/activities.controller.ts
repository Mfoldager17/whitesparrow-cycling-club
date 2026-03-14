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
  Query,
  Redirect,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CancelActivityDto, UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ActivityResponseDto, ActivityWithStatsDto } from './dto/activity-response.dto';
import { RouteDataDto } from './dto/route-response.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('activities')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('activities')
export class ActivitiesController {
  constructor(private readonly activitiesService: ActivitiesService) {}

  @Get()
  @ApiOperation({ summary: 'List upcoming activities' })
  @ApiResponse({ status: 200, type: [ActivityWithStatsDto] })
  findAll(@Query() query: ActivityQueryDto): Promise<ActivityWithStatsDto[]> {
    return this.activitiesService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get activity details' })
  @ApiResponse({ status: 200, type: ActivityWithStatsDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<ActivityWithStatsDto> {
    return this.activitiesService.findOne(id);
  }

  @Post()
  @ApiOperation({ summary: 'Create a new activity or club event' })
  @ApiResponse({ status: 201, type: ActivityResponseDto })
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.create(user, dto);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update an activity' })
  @ApiResponse({ status: 200, type: ActivityResponseDto })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.update(user, id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({ summary: 'Cancel an activity' })
  @ApiResponse({ status: 200, type: ActivityResponseDto })
  cancel(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: CancelActivityDto,
  ): Promise<ActivityResponseDto> {
    return this.activitiesService.cancel(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete an activity' })
  @ApiResponse({ status: 204 })
  delete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.activitiesService.delete(user, id);
  }

  @Post(':id/route')
  @ApiOperation({ summary: 'Upload a GPX route for an activity' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { file: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 201, type: RouteDataDto })
  @UseInterceptors(FileInterceptor('file'))
  uploadRoute(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<RouteDataDto> {
    return this.activitiesService.uploadRoute(user, id, file);
  }

  @Delete(':id/route')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete the GPX route for an activity' })
  @ApiResponse({ status: 204 })
  deleteRoute(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.activitiesService.deleteRoute(user, id);
  }

  @Get(':id/route/download')
  @Redirect()
  @ApiOperation({ summary: 'Download the GPX file (redirects to presigned URL)' })
  async downloadRoute(@Param('id', ParseUUIDPipe) id: string) {
    const url = await this.activitiesService.downloadRoute(id);
    return { url, statusCode: 302 };
  }

  @Get(':id/route/download-url')
  @ApiOperation({ summary: 'Get presigned download URL as JSON' })
  async downloadRouteUrl(@Param('id', ParseUUIDPipe) id: string): Promise<{ url: string }> {
    const url = await this.activitiesService.downloadRoute(id);
    return { url };
  }
}

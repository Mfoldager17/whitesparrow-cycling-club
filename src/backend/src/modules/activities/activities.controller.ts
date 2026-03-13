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
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { ActivitiesService } from './activities.service';
import { CreateActivityDto } from './dto/create-activity.dto';
import { CancelActivityDto, UpdateActivityDto } from './dto/update-activity.dto';
import { ActivityQueryDto } from './dto/activity-query.dto';
import { ActivityResponseDto, ActivityWithStatsDto } from './dto/activity-response.dto';
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
}

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
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RoutesService } from './routes.service';
import {
  CreateRouteDto,
  PlannedRouteDto,
  PlanRouteDto,
  SavedRouteDto,
  SavedRouteSummaryDto,
  SnapWaypointDto,
  UpdateRouteDto,
  WaypointDto,
} from './dto/route.dto';

@ApiTags('routes')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('routes')
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Post('snap')
  @ApiOperation({ summary: 'Snap a coordinate to the nearest cycleable road/path' })
  @ApiResponse({ status: 201, type: WaypointDto })
  snap(@Body() dto: SnapWaypointDto): Promise<WaypointDto> {
    return this.routesService.snap(dto);
  }

  @Post('plan')
  @ApiOperation({ summary: 'Preview a cycling route without saving' })
  @ApiResponse({ status: 201, type: PlannedRouteDto })
  plan(@Body() dto: PlanRouteDto): Promise<PlannedRouteDto> {
    return this.routesService.plan(dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all saved routes' })
  @ApiResponse({ status: 200, type: [SavedRouteSummaryDto] })
  findAll(): Promise<SavedRouteSummaryDto[]> {
    return this.routesService.findAll();
  }

  @Post()
  @ApiOperation({ summary: 'Save a new planned route' })
  @ApiResponse({ status: 201, type: SavedRouteDto })
  create(
    @CurrentUser() user: User,
    @Body() dto: CreateRouteDto,
  ): Promise<SavedRouteDto> {
    return this.routesService.create(user, dto);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get route details including track points' })
  @ApiResponse({ status: 200, type: SavedRouteDto })
  findOne(@Param('id', ParseUUIDPipe) id: string): Promise<SavedRouteDto> {
    return this.routesService.findOne(id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update route name or description' })
  @ApiResponse({ status: 200, type: SavedRouteDto })
  update(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateRouteDto,
  ): Promise<SavedRouteDto> {
    return this.routesService.update(user, id, dto);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete a saved route' })
  @ApiResponse({ status: 204 })
  delete(
    @CurrentUser() user: User,
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<void> {
    return this.routesService.delete(user, id);
  }

  @Get(':id/export.gpx')
  @ApiOperation({ summary: 'Download a saved route as a GPX file' })
  async exportGpx(
    @Param('id', ParseUUIDPipe) id: string,
    @Res() res: Response,
  ): Promise<void> {
    const { name, buffer } = await this.routesService.exportGpx(id);
    const filename = `${name.replace(/[^\w\s-]/g, '').trim().replace(/\s+/g, '_') || 'route'}.gpx`;
    res.set({
      'Content-Type': 'application/gpx+xml',
      'Content-Disposition': `attachment; filename="${filename}"`,
      'Content-Length': buffer.length.toString(),
    });
    res.send(buffer);
  }
}

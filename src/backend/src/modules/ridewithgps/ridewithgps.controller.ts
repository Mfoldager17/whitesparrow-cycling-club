import {
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
  NotFoundException,
  Param,
  Post,
  Query,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Response } from 'express';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { User } from '@prisma/client';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RidewithgpsService } from './ridewithgps.service';
import { ActivitiesService } from '../activities/activities.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('ridewithgps')
@ApiBearerAuth()
@Controller('ridewithgps')
export class RidewithgpsController {
  private readonly logger = new Logger(RidewithgpsController.name);
  constructor(
    private readonly rwgps: RidewithgpsService,
    private readonly activities: ActivitiesService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Return the RideWithGPS OAuth URL — frontend fetches this then navigates */
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get RideWithGPS OAuth URL' })
  connect(@CurrentUser() user: User): { url: string } {
    return { url: this.rwgps.getAuthUrl(user.id) };
  }

  /** RideWithGPS calls this back with code & state after the user approves — no JWT, state is HMAC-verified */
  @Get('callback')
  @ApiOperation({ summary: 'RideWithGPS OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    if (error || !code || !state) {
      return res.redirect(`${frontendUrl}/profile?rwgps=error`);
    }
    try {
      const userId = this.rwgps.verifyState(state);
      await this.rwgps.handleCallback(userId, code);
      return res.redirect(`${frontendUrl}/profile?rwgps=connected`);
    } catch (err) {
      this.logger.error('RideWithGPS callback failed', err instanceof Error ? err.message : err);
      return res.redirect(`${frontendUrl}/profile?rwgps=error`);
    }
  }

  /** Current user's RideWithGPS connection status */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get RideWithGPS connection status' })
  status(@CurrentUser() user: User) {
    return this.rwgps.getStatus(user.id);
  }

  /** Disconnect — delete stored token */
  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect RideWithGPS account' })
  disconnect(@CurrentUser() user: User) {
    return this.rwgps.disconnect(user.id);
  }

  /** List the user's cycling routes from RideWithGPS */
  @Get('routes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List user's routes on RideWithGPS" })
  listRoutes(@CurrentUser() user: User) {
    return this.rwgps.listRoutes(user.id);
  }

  /**
   * Import a RideWithGPS route as a GPX file into an activity.
   * Downloads the GPX from RideWithGPS, parses it, stores it in MinIO,
   * and saves the route_data row — exactly like a manual upload.
   */
  @Post('routes/:routeId/import/:activityId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import RideWithGPS route GPX into an activity' })
  @ApiResponse({ status: 201 })
  async importRoute(
    @CurrentUser() user: User,
    @Param('routeId') routeId: string,
    @Param('activityId') activityId: string,
  ) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new NotFoundException('Activity not found');

    const gpxBuffer = await this.rwgps.downloadRouteGpx(user.id, routeId);

    const fakeFile: Express.Multer.File = {
      buffer: gpxBuffer,
      originalname: `rwgps-route-${routeId}.gpx`,
      mimetype: 'application/gpx+xml',
      fieldname: 'file',
      encoding: '7bit',
      size: gpxBuffer.length,
      stream: null as any,
      destination: '',
      filename: '',
      path: '',
    };

    return this.activities.uploadRoute(user, activityId, fakeFile);
  }

}

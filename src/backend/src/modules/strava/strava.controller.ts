import {
  BadRequestException,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Logger,
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
import { StravaService } from './strava.service';
import { ActivitiesService } from '../activities/activities.service';
import { PrismaService } from '../../database/prisma.service';
import { ConfigService } from '@nestjs/config';

@ApiTags('strava')
@ApiBearerAuth()
@Controller('strava')
export class StravaController {
  private readonly logger = new Logger(StravaController.name);
  constructor(
    private readonly strava: StravaService,
    private readonly activities: ActivitiesService,
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {}

  /** Return the Strava OAuth URL — frontend fetches this then navigates */
  @Get('connect')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Strava OAuth URL' })
  connect(@CurrentUser() user: User): { url: string } {
    return { url: this.strava.getAuthUrl(user.id) };
  }

  /** Strava calls this back with code & state after the user approves — no JWT, state is HMAC-verified */
  @Get('callback')
  @ApiOperation({ summary: 'Strava OAuth callback' })
  async callback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Query('error') error: string | undefined,
    @Res() res: Response,
  ) {
    const frontendUrl = this.config.get('FRONTEND_URL', 'http://localhost:3000');
    if (error || !code || !state) {
      return res.redirect(`${frontendUrl}/profile?strava=error`);
    }
    try {
      const userId = this.strava.verifyState(state);
      await this.strava.handleCallback(userId, code);
      return res.redirect(`${frontendUrl}/profile?strava=connected`);
    } catch (err) {
      this.logger.error('Strava callback failed', err instanceof Error ? err.message : err);
      return res.redirect(`${frontendUrl}/profile?strava=error`);
    }
  }

  /** Current user's Strava connection status */
  @Get('status')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Get Strava connection status' })
  status(@CurrentUser() user: User) {
    return this.strava.getStatus(user.id);
  }

  /** Disconnect — delete stored tokens */
  @Delete('disconnect')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Disconnect Strava account' })
  disconnect(@CurrentUser() user: User) {
    return this.strava.disconnect(user.id);
  }

  /** List the user's cycling routes from Strava */
  @Get('routes')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: "List user's cycling routes on Strava" })
  listRoutes(@CurrentUser() user: User) {
    return this.strava.listRoutes(user.id);
  }

  /**
   * Import a Strava route as a GPX file into an activity.
   * Downloads the GPX from Strava, parses it, stores it in MinIO,
   * and saves the route_data row — exactly like a manual upload.
   */
  @Post('routes/:routeId/import/:activityId')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Import Strava route GPX into an activity' })
  @ApiResponse({ status: 201 })
  async importRoute(
    @CurrentUser() user: User,
    @Param('routeId') routeId: string,
    @Param('activityId') activityId: string,
  ) {
    const activity = await this.prisma.activity.findUnique({ where: { id: activityId } });
    if (!activity) throw new Error('Activity not found');

    const gpxBuffer = await this.strava.downloadRouteGpx(user.id, routeId);

    const fakeFile: Express.Multer.File = {
      buffer: gpxBuffer,
      originalname: `strava-route-${routeId}.gpx`,
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

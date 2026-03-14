import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { createHmac, timingSafeEqual } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../database/prisma.service';
import { OAuthToken } from '@prisma/client';

interface StravaTokenResponse {
  access_token: string;
  refresh_token: string;
  expires_at: number; // Unix timestamp
  athlete: {
    id: number;
    firstname: string;
    lastname: string;
    profile: string; // avatar URL
  };
}

export interface StravaRoute {
  id: string;
  name: string;
  distance: number; // meters
  elevation_gain: number; // meters
  map: { summary_polyline: string };
  type: number; // 1 = ride
  sub_type: number; // 1 = road
  created_at: string;
}

@Injectable()
export class StravaService {
  private readonly logger = new Logger(StravaService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.clientId = this.config.getOrThrow('STRAVA_CLIENT_ID');
    this.clientSecret = this.config.getOrThrow('STRAVA_CLIENT_SECRET');
    this.redirectUri = this.config.get(
      'STRAVA_REDIRECT_URI',
      'http://localhost:3001/strava/callback',
    );
  }

  /** Sign userId+timestamp into a tamper-proof state token */
  private signState(userId: string): string {
    const expiresAt = Math.floor(Date.now() / 1000) + 10 * 60; // 10 min
    const payload = `${userId}:${expiresAt}`;
    const secret = this.config.get<string>('JWT_SECRET', 'fallback');
    const sig = createHmac('sha256', secret).update(payload).digest('hex');
    return Buffer.from(`${payload}:${sig}`).toString('base64url');
  }

  /** Verify and extract userId from state; throws if invalid or expired */
  verifyState(state: string): string {
    let userId: string;
    let expiresAt: number;
    let sig: string;
    let payload: string;
    try {
      const decoded = Buffer.from(state, 'base64url').toString();
      const parts = decoded.split(':');
      userId = parts[0];
      expiresAt = Number(parts[1]);
      sig = parts[2];
      payload = `${userId}:${expiresAt}`;
    } catch {
      throw new UnauthorizedException('Invalid OAuth state');
    }

    const secret = this.config.get<string>('JWT_SECRET', 'fallback');
    const expected = createHmac('sha256', secret).update(payload).digest('hex');
    const sigBuf = Buffer.from(sig, 'hex');
    const expBuf = Buffer.from(expected, 'hex');
    if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
      throw new UnauthorizedException('Invalid OAuth state signature');
    }
    if (Math.floor(Date.now() / 1000) > expiresAt) {
      throw new UnauthorizedException('OAuth state expired — please try connecting again');
    }
    return userId;
  }

  /** Build the Strava OAuth authorisation URL */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      approval_prompt: 'auto',
      scope: 'read,activity:read,profile:read_all',
      state: this.signState(userId),
    });
    return `https://www.strava.com/oauth/authorize?${params}`;
  }

  /** Exchange auth code for tokens and persist to DB */
  async handleCallback(userId: string, code: string): Promise<void> {
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
      }),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      throw new BadRequestException(`Strava token exchange failed: ${text.slice(0, 200)}`);
    }

    const data = (await res.json()) as StravaTokenResponse;

    await this.prisma.oAuthToken.upsert({
      where: { userId_platform: { userId, platform: 'strava' } },
      update: {
        externalUserId: String(data.athlete.id),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at * 1000),
        scope: 'read,activity:read',
        userName: `${data.athlete.firstname} ${data.athlete.lastname}`.trim(),
        userAvatar: data.athlete.profile,
      },
      create: {
        userId,
        platform: 'strava',
        externalUserId: String(data.athlete.id),
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at * 1000),
        scope: 'read,activity:read',
        userName: `${data.athlete.firstname} ${data.athlete.lastname}`.trim(),
        userAvatar: data.athlete.profile,
      },
    });
  }

  /** Return the stored token for a user, refreshing if it's expiring within 5 min */
  async getValidToken(userId: string): Promise<OAuthToken> {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { userId_platform: { userId, platform: 'strava' } },
    });
    if (!token) throw new NotFoundException('No Strava connection found');

    const fiveMinutes = 5 * 60 * 1000;
    if (token.expiresAt && token.expiresAt.getTime() - Date.now() > fiveMinutes) {
      return token;
    }

    // Refresh
    const res = await fetch('https://www.strava.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
      }),
    });

    if (!res.ok) throw new BadRequestException('Failed to refresh Strava token');

    const data = (await res.json()) as Omit<StravaTokenResponse, 'athlete'>;

    return this.prisma.oAuthToken.update({
      where: { userId_platform: { userId, platform: 'strava' } },
      data: {
        accessToken: data.access_token,
        refreshToken: data.refresh_token,
        expiresAt: new Date(data.expires_at * 1000),
      },
    });
  }

  /** Return stored connection status for the user */
  async getStatus(userId: string) {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { userId_platform: { userId, platform: 'strava' } },
    });
    if (!token) return { connected: false };
    return {
      connected: true,
      athleteName: token.userName,
      athleteAvatar: token.userAvatar,
    };
  }

  /** Disconnect — delete stored token */
  async disconnect(userId: string): Promise<void> {
    await this.prisma.oAuthToken.deleteMany({ where: { userId, platform: 'strava' } });
  }

  /** List the user's Strava routes (cycling only) */
  async listRoutes(userId: string): Promise<StravaRoute[]> {
    const token = await this.getValidToken(userId);
    const res = await fetch(
      `https://www.strava.com/api/v3/athletes/${token.externalUserId}/routes?per_page=50`,
      { headers: { Authorization: `Bearer ${token.accessToken}` } },
    );
    if (!res.ok) throw new BadRequestException('Failed to fetch Strava routes');
    // Large 64-bit IDs lose precision when parsed as JS numbers.
    // Quote them as strings before JSON.parse to preserve the full value.
    const text = await res.text();
    const safe = text.replace(/"id"\s*:\s*(\d{10,})/g, '"id":"$1"');
    const routes = JSON.parse(safe) as StravaRoute[];
    // type 1 = cycling route
    return routes.filter((r) => r.type === 1);
  }

  /** Download a single Strava route as a GPX buffer */
  async downloadRouteGpx(userId: string, routeId: string): Promise<Buffer> {
    const token = await this.getValidToken(userId);
    const res = await fetch(
      `https://www.strava.com/api/v3/routes/${routeId}/export_gpx`,
      { headers: { Authorization: `Bearer ${token.accessToken}` } },
    );
    if (!res.ok) throw new BadRequestException('Failed to download GPX from Strava');
    return Buffer.from(await res.arrayBuffer());
  }
}

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

interface RwgpsTokenResponse {
  access_token: string;
  token_type: string;
  scope: string;
  created_at: number;
  user_id: number;
}

interface RwgpsUserResponse {
  user: {
    id: number;
    name: string;
    avatar_url?: string;
  };
}

interface RwgpsRoutesResponse {
  results: RwgpsRoute[];
  results_count: number;
}

export interface RwgpsRoute {
  id: number;
  name: string;
  distance: number;       // meters
  elevation_gain: number; // meters
}

@Injectable()
export class RidewithgpsService {
  private readonly logger = new Logger(RidewithgpsService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly redirectUri: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.clientId = this.config.getOrThrow('RWGPS_CLIENT_ID');
    this.clientSecret = this.config.getOrThrow('RWGPS_CLIENT_SECRET');
    this.redirectUri = this.config.get(
      'RWGPS_REDIRECT_URI',
      'http://localhost:3001/ridewithgps/callback',
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

  /** Build the RideWithGPS OAuth authorisation URL */
  getAuthUrl(userId: string): string {
    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.redirectUri,
      response_type: 'code',
      state: this.signState(userId),
    });
    return `https://ridewithgps.com/oauth/authorize?${params}`;
  }

  /** Exchange auth code for tokens and persist to DB */
  async handleCallback(userId: string, code: string): Promise<void> {
    const res = await fetch('https://ridewithgps.com/oauth/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        grant_type: 'authorization_code',
        redirect_uri: this.redirectUri,
      }),
    });

    const rawText = await res.text();
    if (!res.ok) {
      throw new BadRequestException(`RideWithGPS token exchange failed: ${rawText.slice(0, 200)}`);
    }

    const data = JSON.parse(rawText) as RwgpsTokenResponse;

    // Fetch user profile for name/avatar
    let userName: string | null = null;
    let userAvatar: string | null = null;
    try {
      const profileRes = await fetch(`https://ridewithgps.com/users/${data.user_id}.json`, {
        headers: { Authorization: `Bearer ${data.access_token}` },
      });
      if (profileRes.ok) {
        const profile = (await profileRes.json()) as RwgpsUserResponse;
        userName = profile.user?.name ?? null;
        userAvatar = profile.user?.avatar_url ?? null;
      }
    } catch (err) {
      this.logger.warn('Could not fetch RideWithGPS user profile', err);
    }

    await this.prisma.oAuthToken.upsert({
      where: { userId_platform: { userId, platform: 'rwgps' } },
      update: {
        externalUserId: String(data.user_id),
        accessToken: data.access_token,
        userName,
        userAvatar,
      },
      create: {
        userId,
        platform: 'rwgps',
        externalUserId: String(data.user_id),
        accessToken: data.access_token,
        userName,
        userAvatar,
      },
    });
  }

  /** Return stored connection status for the user */
  async getStatus(userId: string) {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { userId_platform: { userId, platform: 'rwgps' } },
    });
    if (!token) return { connected: false };
    return {
      connected: true,
      userName: token.userName,
      userAvatar: token.userAvatar,
    };
  }

  /** Disconnect — delete stored token */
  async disconnect(userId: string): Promise<void> {
    await this.prisma.oAuthToken.deleteMany({ where: { userId, platform: 'rwgps' } });
  }

  /**
   * Call the RWGPS /users/current.json endpoint with the stored Bearer token.
   * RWGPS responds with `set-cookie` headers that establish a session for the
   * ridewithgps.com domain, enabling authenticated iframe embeds.
   * Returns the current user data from RWGPS so the frontend knows the session
   * was established successfully.
   */
  async getSession(userId: string): Promise<{ externalUserId: string; userName: string | null }> {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { userId_platform: { userId, platform: 'rwgps' } },
    });
    if (!token) throw new NotFoundException('No RideWithGPS connection found');

    const url = new URL('https://ridewithgps.com/users/current.json');
    url.searchParams.set('apikey', this.clientId);
    url.searchParams.set('version', '2');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    if (!res.ok) {
      throw new BadRequestException('Failed to establish RideWithGPS session');
    }

    const body = (await res.json()) as { user?: { id: number; name?: string } };
    return {
      externalUserId: token.externalUserId,
      userName: body.user?.name ?? token.userName,
    };
  }

  /** List the user's RideWithGPS routes */
  async listRoutes(userId: string): Promise<RwgpsRoute[]> {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { userId_platform: { userId, platform: 'rwgps' } },
    });
    if (!token) throw new NotFoundException('No RideWithGPS connection found');

    const url = new URL(
      `https://ridewithgps.com/users/${token.externalUserId}/routes.json`,
    );
    url.searchParams.set('apikey', this.clientId);
    url.searchParams.set('version', '2');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    if (!res.ok) throw new BadRequestException('Failed to fetch RideWithGPS routes');

    const body = (await res.json()) as RwgpsRoutesResponse;
    return body.results ?? [];
  }

  /** Download a single RideWithGPS route as a GPX buffer */
  async downloadRouteGpx(userId: string, routeId: string): Promise<Buffer> {
    const token = await this.prisma.oAuthToken.findUnique({
      where: { userId_platform: { userId, platform: 'rwgps' } },
    });
    if (!token) throw new NotFoundException('No RideWithGPS connection found');

    const url = new URL(`https://ridewithgps.com/routes/${routeId}.gpx`);
    url.searchParams.set('apikey', this.clientId);
    url.searchParams.set('version', '2');

    const res = await fetch(url.toString(), {
      headers: { Authorization: `Bearer ${token.accessToken}` },
    });

    if (!res.ok) throw new BadRequestException('Failed to download GPX from RideWithGPS');
    return Buffer.from(await res.arrayBuffer());
  }
}

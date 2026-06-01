import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';
import * as crypto from 'crypto';

type AtlassianTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

type AtlassianAccessibleResource = {
  id: string;
  name: string;
  url: string;
  scopes: string[];
  avatarUrl?: string;
};

@Injectable()
export class JiraAuthService {
  constructor(private readonly prisma: PrismaService) {}

  buildAuthorizationUrl(userId: string, returnTo?: string): string {
    const state = this.createSignedState(userId, returnTo);

    const params = new URLSearchParams({
      audience: 'api.atlassian.com',
      client_id: process.env.ATLASSIAN_CLIENT_ID!,
      scope: process.env.ATLASSIAN_SCOPES!,
      redirect_uri: process.env.ATLASSIAN_REDIRECT_URI!,
      state,
      response_type: 'code',
      prompt: 'consent',
    });

    return `https://auth.atlassian.com/authorize?${params.toString()}`;
  }

  async handleCallback(code: string, state: string) {
    const { userId, returnTo } = this.verifySignedState(state);

    const tokenRes = await axios.post<AtlassianTokenResponse>(
      'https://auth.atlassian.com/oauth/token',
      {
        grant_type: 'authorization_code',
        client_id: process.env.ATLASSIAN_CLIENT_ID,
        client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
        code,
        redirect_uri: process.env.ATLASSIAN_REDIRECT_URI,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const tokenData = tokenRes.data;

    if (!tokenData.access_token) {
      throw new BadRequestException('Failed to obtain Atlassian access token');
    }

    const resourcesRes = await axios.get<AtlassianAccessibleResource[]>(
      'https://api.atlassian.com/oauth/token/accessible-resources',
      {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: 'application/json',
        },
      },
    );

    const resources = resourcesRes.data;

    if (!resources.length) {
      throw new BadRequestException(
        'No Jira Cloud site found for this Atlassian account',
      );
    }

    const expiresAt = new Date(Date.now() + tokenData.expires_in * 1000);

    const savedConnections = await Promise.all(
      resources.map((site) =>
        this.prisma.jiraConnection.upsert({
          where: {
            userId_cloudId: {
              userId,
              cloudId: site.id,
            },
          },
          update: {
            siteName: site.name,
            siteUrl: site.url,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token ?? '',
            scope: tokenData.scope ?? null,
            expiresAt,
          },
          create: {
            userId,
            cloudId: site.id,
            siteName: site.name,
            siteUrl: site.url,
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token ?? '',
            scope: tokenData.scope ?? null,
            expiresAt,
          },
        }),
      ),
    );

    return {
      userId,
      returnTo,
      cloudId: savedConnections[0]?.cloudId,
      connections: savedConnections.map((connection) => ({
        cloudId: connection.cloudId,
        siteName: connection.siteName,
        siteUrl: connection.siteUrl,
      })),
    };
  }

  async getUserConnections(userId: string) {
    return this.prisma.jiraConnection.findMany({
      where: { userId },
      orderBy: [{ siteName: 'asc' }, { createdAt: 'desc' }],
      select: {
        id: true,
        cloudId: true,
        siteName: true,
        siteUrl: true,
        scope: true,
        expiresAt: true,
        createdAt: true,
        updatedAt: true,
      },
    });
  }

  private createSignedState(userId: string, returnTo?: string): string {
    const safeReturnTo = this.sanitizeReturnTo(returnTo);

    const payload = JSON.stringify({
      userId,
      returnTo: safeReturnTo,
      nonce: crypto.randomUUID(),
      exp: Date.now() + 10 * 60 * 1000,
    });

    const payloadBase64 = Buffer.from(payload).toString('base64url');

    const signature = crypto
      .createHmac('sha256', process.env.JIRA_OAUTH_STATE_SECRET!)
      .update(payloadBase64)
      .digest('base64url');

    return `${payloadBase64}.${signature}`;
  }

  private verifySignedState(state: string): {
    userId: string;
    returnTo: string;
  } {
    const [payloadBase64, signature] = state.split('.');

    if (!payloadBase64 || !signature) {
      throw new UnauthorizedException('Invalid OAuth state format');
    }

    const expectedSignature = crypto
      .createHmac('sha256', process.env.JIRA_OAUTH_STATE_SECRET!)
      .update(payloadBase64)
      .digest('base64url');

    if (signature !== expectedSignature) {
      throw new UnauthorizedException('Invalid OAuth state signature');
    }

    const payload = JSON.parse(
      Buffer.from(payloadBase64, 'base64url').toString('utf8'),
    ) as {
      userId: string;
      returnTo?: string;
      nonce: string;
      exp: number;
    };

    if (!payload.userId || !payload.exp) {
      throw new UnauthorizedException('Invalid OAuth state payload');
    }

    if (Date.now() > payload.exp) {
      throw new UnauthorizedException('OAuth state expired');
    }

    return {
      userId: payload.userId,
      returnTo: payload.returnTo || '/tester/projects',
    };
  }

  private sanitizeReturnTo(returnTo?: string): string {
    if (!returnTo || !returnTo.startsWith('/')) {
      return '/tester/projects';
    }

    return returnTo;
  }
}

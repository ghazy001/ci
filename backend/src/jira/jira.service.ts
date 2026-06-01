import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

type AtlassianTokenResponse = {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope?: string;
  token_type: string;
};

type JiraSearchFilters = {
  query: string;
  cloudId?: string;
  projectKey?: string;
  status?: string;
  issueType?: string;
};

@Injectable()
export class JiraService {
  constructor(private readonly prisma: PrismaService) {}

  async getUserConnection(userId: string, cloudId?: string) {
    const connection = cloudId
      ? await this.prisma.jiraConnection.findUnique({
          where: {
            userId_cloudId: {
              userId,
              cloudId,
            },
          },
        })
      : await this.prisma.jiraConnection.findFirst({
          where: { userId },
          orderBy: { createdAt: 'desc' },
        });

    if (!connection) {
      throw new BadRequestException(
        cloudId
          ? 'Selected Jira connection was not found for this user'
          : 'No Jira connection found for this user',
      );
    }

    return connection;
  }

  async ensureValidAccessToken(userId: string, cloudId?: string) {
    const connection = await this.getUserConnection(userId, cloudId);

    const now = new Date();
    const expiresAt = connection.expiresAt ?? null;
    const isExpired =
      !expiresAt || expiresAt.getTime() <= now.getTime() + 60 * 1000;

    if (!isExpired) {
      return connection;
    }

    if (!connection.refreshToken) {
      throw new UnauthorizedException(
        'Jira access token expired and no refresh token is available',
      );
    }

    const tokenRes = await axios.post<AtlassianTokenResponse>(
      'https://auth.atlassian.com/oauth/token',
      {
        grant_type: 'refresh_token',
        client_id: process.env.ATLASSIAN_CLIENT_ID,
        client_secret: process.env.ATLASSIAN_CLIENT_SECRET,
        refresh_token: connection.refreshToken,
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
      },
    );

    const tokenData = tokenRes.data;

    if (!tokenData.access_token) {
      throw new UnauthorizedException('Failed to refresh Jira access token');
    }

    return this.prisma.jiraConnection.update({
      where: { id: connection.id },
      data: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token ?? connection.refreshToken,
        scope: tokenData.scope ?? connection.scope,
        expiresAt: new Date(Date.now() + tokenData.expires_in * 1000),
      },
    });
  }

  async getIssueByKey(userId: string, issueKey: string, cloudId?: string) {
    const connection = await this.ensureValidAccessToken(userId, cloudId);

    const url = `https://api.atlassian.com/ex/jira/${connection.cloudId}/rest/api/3/issue/${encodeURIComponent(
      issueKey,
    )}`;

    const res = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${connection.accessToken}`,
        Accept: 'application/json',
      },
      params: {
        fields: [
          'summary',
          'description',
          'issuetype',
          'priority',
          'status',
          'project',
          'labels',
        ].join(','),
      },
    });

    return {
      connection,
      issue: res.data,
    };
  }

  async searchIssues(userId: string, filters: JiraSearchFilters) {
    const trimmedQuery = filters.query.trim();

    if (!trimmedQuery) {
      throw new BadRequestException('query is required');
    }

    const connection = await this.ensureValidAccessToken(
      userId,
      filters.cloudId,
    );

    const url = `https://api.atlassian.com/ex/jira/${connection.cloudId}/rest/api/3/search/jql`;

    const escapedQuery = trimmedQuery.replace(/"/g, '\\"');

    const jqlParts: string[] = [
      `(summary ~ "${escapedQuery}" OR text ~ "${escapedQuery}" OR key ~ "${escapedQuery}")`,
    ];

    if (filters.projectKey?.trim()) {
      jqlParts.push(`project = "${filters.projectKey.trim().toUpperCase()}"`);
    }

    if (filters.status?.trim()) {
      jqlParts.push(`status = "${filters.status.trim()}"`);
    }

    if (filters.issueType?.trim()) {
      jqlParts.push(`issuetype = "${filters.issueType.trim()}"`);
    }

    const jql = `${jqlParts.join(' AND ')} ORDER BY updated DESC`;

    try {
      const res = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${connection.accessToken}`,
          Accept: 'application/json',
        },
        params: {
          jql,
          maxResults: 12,
          fields: [
            'summary',
            'issuetype',
            'priority',
            'status',
            'project',
            'updated',
            'assignee',
          ].join(','),
        },
      });

      return {
        site: {
          cloudId: connection.cloudId,
          siteName: connection.siteName,
          siteUrl: connection.siteUrl,
        },
        filters: {
          query: trimmedQuery,
          cloudId: connection.cloudId,
          projectKey: filters.projectKey ?? null,
          status: filters.status ?? null,
          issueType: filters.issueType ?? null,
        },
        issues: (res.data.issues ?? []).map((issue: any) => ({
          id: issue.id,
          key: issue.key,
          summary: issue.fields?.summary ?? '',
          issueType: issue.fields?.issuetype?.name ?? null,
          priority: issue.fields?.priority?.name ?? null,
          status: issue.fields?.status?.name ?? null,
          projectName: issue.fields?.project?.name ?? null,
          projectKey: issue.fields?.project?.key ?? null,
          updated: issue.fields?.updated ?? null,
          assignee: issue.fields?.assignee?.displayName ?? null,
        })),
      };
    } catch (error: any) {
      const jiraMessage =
        error?.response?.data?.errorMessages?.join(', ') ||
        error?.response?.data?.message ||
        'Failed to search Jira issues';

      throw new BadRequestException(jiraMessage);
    }
  }
}

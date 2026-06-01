import {
  BadRequestException,
  Controller,
  Get,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { JiraAuthService } from './jira-auth.service';
import { JiraService } from './jira.service';
import { WorkItemMapper } from '../work-items/work-items.mapper';

@Controller('jira')
export class JiraController {
  constructor(
    private readonly jiraAuthService: JiraAuthService,
    private readonly jiraService: JiraService,
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('oauth/url')
  getAuthorizationUrl(@Req() req: any, @Query('returnTo') returnTo?: string) {
    const url = this.jiraAuthService.buildAuthorizationUrl(
      req.user.id,
      returnTo,
    );

    return { url };
  }

  @Get('oauth/callback')
  async callback(
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
    @Query('error') error?: string,
    @Query('error_description') errorDescription?: string,
  ) {
    if (error) {
      const message = encodeURIComponent(errorDescription || error);

      return res.redirect(
        `${process.env.FRONTEND_URL}/tester/projects?status=error&message=${message}`,
      );
    }

    if (!code || !state) {
      throw new BadRequestException('Missing OAuth code or state');
    }

    const result = await this.jiraAuthService.handleCallback(code, state);

    return res.redirect(
      `${process.env.FRONTEND_URL}${result.returnTo}?status=success&cloudId=${result.cloudId}`,
    );
  }

  @UseGuards(JwtAuthGuard)
  @Get('oauth/connections')
  async getConnections(@Req() req: any) {
    return this.jiraAuthService.getUserConnections(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Get('issue')
  async getIssuePreview(
    @Req() req: any,
    @Query('issueKey') issueKey?: string,
    @Query('cloudId') cloudId?: string,
  ) {
    if (!issueKey?.trim()) {
      throw new BadRequestException('issueKey is required');
    }

    const normalizedIssueKey = issueKey.trim().toUpperCase();

    const { connection, issue } = await this.jiraService.getIssueByKey(
      req.user.id,
      normalizedIssueKey,
      cloudId,
    );

    const mapped = WorkItemMapper.fromJiraIssue(issue);

    return {
      site: {
        cloudId: connection.cloudId,
        siteName: connection.siteName,
        siteUrl: connection.siteUrl,
      },
      issue: {
        id: issue.id,
        key: issue.key,
        summary: issue.fields?.summary ?? '',
        status: issue.fields?.status?.name ?? null,
        issueType: issue.fields?.issuetype?.name ?? null,
        priority: issue.fields?.priority?.name ?? null,
        project: issue.fields?.project?.name ?? null,
      },
      mapped,
    };
  }

  @UseGuards(JwtAuthGuard)
  @Get('search')
  async searchIssues(
    @Req() req: any,
    @Query('query') query?: string,
    @Query('cloudId') cloudId?: string,
    @Query('projectKey') projectKey?: string,
    @Query('status') status?: string,
    @Query('issueType') issueType?: string,
  ) {
    if (!query?.trim()) {
      throw new BadRequestException('query is required');
    }

    return this.jiraService.searchIssues(req.user.id, {
      query,
      cloudId,
      projectKey,
      status,
      issueType,
    });
  }
}

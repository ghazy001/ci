import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { BrowserTarget, ScheduledTestRunStatus } from '@prisma/client';

export class UpdateScheduledTestRunDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsEnum(ScheduledTestRunStatus)
  status?: ScheduledTestRunStatus;

  @IsOptional()
  @IsString()
  cronExpression?: string;

  @IsOptional()
  @IsString()
  timezone?: string;

  @IsOptional()
  @IsString()
  targetUrl?: string;

  @IsOptional()
  @IsEnum(BrowserTarget)
  browser?: BrowserTarget;

  @IsOptional()
  @IsString()
  environment?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

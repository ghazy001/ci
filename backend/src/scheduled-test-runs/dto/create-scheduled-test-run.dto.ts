import {
  IsEnum,
  IsNotEmpty,
  IsObject,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';
import { BrowserTarget } from '@prisma/client';

export enum SchedulePreset {
  DAILY = 'DAILY',
  WEEKLY = 'WEEKLY',
  MONTHLY = 'MONTHLY',
  CUSTOM_CRON = 'CUSTOM_CRON',
}

export class CreateScheduledTestRunDto {
  @IsUUID()
  scriptId: string;

  @IsString()
  @IsNotEmpty()
  name: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsEnum(SchedulePreset)
  preset: SchedulePreset;

  /**
   * Required for WEEKLY.
   * Example: FRI
   */
  @IsOptional()
  @IsString()
  dayOfWeek?: 'SUN' | 'MON' | 'TUE' | 'WED' | 'THU' | 'FRI' | 'SAT';

  /**
   * Required for MONTHLY.
   * Example: 15
   */
  @IsOptional()
  dayOfMonth?: number;

  /**
   * Format: HH:mm
   * Example: 09:00
   */
  @IsString()
  @IsNotEmpty()
  time: string;

  /**
   * Required only for CUSTOM_CRON.
   */
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

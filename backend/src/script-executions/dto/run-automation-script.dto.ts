// src/script-executions/dto/run-automation-script.dto.ts

import { IsEnum, IsObject, IsOptional, IsString, IsUrl } from 'class-validator';
import { BrowserTarget } from '@prisma/client';

export class RunAutomationScriptDto {
  @IsOptional()
  @IsUrl({ require_tld: false })
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

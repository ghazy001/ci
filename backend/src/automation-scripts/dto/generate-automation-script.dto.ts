import {
  IsBoolean,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
  IsUrl,
  MaxLength,
} from 'class-validator';
import { AutomationFramework, BrowserTarget } from '@prisma/client';

export enum SelectorsStrategy {
  ROLE_FIRST = 'ROLE_FIRST',
  DATA_TEST_ID_FIRST = 'DATA_TEST_ID_FIRST',
  CSS_FALLBACK = 'CSS_FALLBACK',
  AUTO = 'AUTO',
}

export class GenerateAutomationScriptDto {
  @IsEnum(AutomationFramework)
  framework: AutomationFramework;

  @IsUrl({
    require_protocol: true,
  })
  targetUrl: string;

  @IsOptional()
  @IsEnum(BrowserTarget)
  browser?: BrowserTarget;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  environment?: string;

  @IsOptional()
  @IsEnum(SelectorsStrategy)
  selectorsStrategy?: SelectorsStrategy = SelectorsStrategy.AUTO;

  @IsOptional()
  @IsBoolean()
  authRequired?: boolean = false;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  authRole?: string;

  @IsOptional()
  @IsString()
  @MaxLength(1500)
  authInstructions?: string;

  @IsOptional()
  @IsString()
  @MaxLength(2500)
  extraInstructions?: string;

  @IsOptional()
  @IsObject()
  variables?: Record<string, string>;
}

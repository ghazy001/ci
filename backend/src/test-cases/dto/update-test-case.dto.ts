import {
  IsArray,
  IsEnum,
  IsObject,
  IsOptional,
  IsString,
} from 'class-validator';
import { TestCasePriority, TestCaseType } from '@prisma/client';

export class UpdateTestCaseDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  objective?: string;

  @IsOptional()
  @IsEnum(TestCaseType)
  type?: TestCaseType;

  @IsOptional()
  @IsEnum(TestCasePriority)
  priority?: TestCasePriority;

  @IsOptional()
  @IsArray()
  preconditions?: string[];

  @IsOptional()
  @IsArray()
  steps?: {
    order: number;
    action: string;
    expected?: string;
  }[];

  @IsOptional()
  @IsString()
  expectedResult?: string;

  @IsOptional()
  @IsObject()
  testData?: Record<string, unknown>;

  @IsOptional()
  @IsArray()
  tags?: string[];

  @IsOptional()
  @IsObject()
  coverage?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

import {
  IsArray,
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { WorkItemType } from '@prisma/client';

export class ExtractedSpecWorkItemDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsEnum(WorkItemType)
  type: WorkItemType;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  acceptanceCriteria?: string[];

  @IsArray()
  @IsString({ each: true })
  @IsOptional()
  businessRules?: string[];

  @IsString()
  @IsOptional()
  priority?: string | null;

  @IsNumber()
  @Min(0)
  @Max(1)
  confidence: number;

  @IsString()
  @IsOptional()
  sourceSection?: string | null;
}

export class ImportSpecWorkItemsDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsOptional()
  fileName?: string;

  @IsString()
  @IsOptional()
  extractionModel?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExtractedSpecWorkItemDto)
  workItems: ExtractedSpecWorkItemDto[];
}

import {
  IsArray,
  IsEnum,
  IsOptional,
  IsString,
  IsUUID,
  ArrayUnique,
} from 'class-validator';

export enum WorkItemTypeDto {
  FEATURE = 'FEATURE',
  BUG = 'BUG',
  IMPROVEMENT = 'IMPROVEMENT',
  TASK = 'TASK',
  USER_STORY = 'USER_STORY',
}

export class CreateWorkItemDto {
  @IsUUID()
  projectId: string;

  @IsEnum(WorkItemTypeDto)
  type: WorkItemTypeDto;

  @IsString()
  title: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  acceptanceCriteria?: string[];

  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  businessRules?: string[];

  @IsOptional()
  @IsString()
  priority?: string;
}

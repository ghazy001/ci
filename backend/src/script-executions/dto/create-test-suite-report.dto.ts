import {
  ArrayNotEmpty,
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
} from 'class-validator';

export class CreateTestSuiteReportDto {
  @IsArray()
  @ArrayNotEmpty()
  @IsUUID('4', { each: true })
  executionIds: string[];

  @IsOptional()
  @IsString()
  title?: string;
}

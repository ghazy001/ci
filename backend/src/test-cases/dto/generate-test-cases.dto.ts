import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class GenerateTestCasesDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  maxTestCases?: number = 10;

  @IsOptional()
  @IsBoolean()
  includePositiveTests?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeNegativeTests?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeEdgeCases?: boolean = true;

  @IsOptional()
  @IsBoolean()
  includeSecurityTests?: boolean = false;

  @IsOptional()
  @IsBoolean()
  useRag?: boolean = false;

  @IsOptional()
  @IsString()
  language?: string;
}

import { IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateAutomationScriptDto {
  @IsOptional()
  @IsString()
  @MaxLength(255)
  fileName?: string;

  @IsOptional()
  @IsString()
  code?: string;

  @IsOptional()
  @IsString()
  explanation?: string;

  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

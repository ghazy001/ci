import { IsOptional, IsString } from 'class-validator';

export class ReviewAutomationScriptDto {
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

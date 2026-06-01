import { IsOptional, IsString } from 'class-validator';

export class ReviewTestCaseDto {
  @IsOptional()
  @IsString()
  reviewNotes?: string;
}

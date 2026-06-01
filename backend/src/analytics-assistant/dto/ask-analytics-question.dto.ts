import { IsOptional, IsString, MaxLength } from 'class-validator';

export class AskAnalyticsQuestionDto {
  @IsString()
  @MaxLength(1000)
  question: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  projectId?: string;
}

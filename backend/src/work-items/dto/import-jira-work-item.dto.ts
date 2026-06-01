import { IsNotEmpty, IsString } from 'class-validator';

export class ImportJiraWorkItemDto {
  @IsString()
  @IsNotEmpty()
  projectId: string;

  @IsString()
  @IsNotEmpty()
  externalRef: string;

  @IsString()
  @IsNotEmpty()
  cloudId: string;
}

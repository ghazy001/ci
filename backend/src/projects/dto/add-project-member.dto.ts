import { IsEnum, IsNotEmpty, IsUUID } from 'class-validator';

export enum ProjectMemberRoleDto {
  OWNER = 'OWNER',
  TESTER = 'TESTER',
}

export class AddProjectMemberDto {
  @IsUUID()
  @IsNotEmpty()
  userId: string;

  @IsEnum(ProjectMemberRoleDto)
  role: ProjectMemberRoleDto;
}

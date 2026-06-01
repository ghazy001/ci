import { Controller, Get, Req, UseGuards } from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Role } from '../common/enums/role.enum';

@Controller('stats')
@UseGuards(JwtAuthGuard, RolesGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  @Get('global')
  @Roles(Role.ADMIN)
  getGlobalStats() {
    return this.statsService.getGlobalStats();
  }

  @Get('tester')
  @Roles(Role.TESTER)
  getTesterStats(@Req() req: any) {
    return this.statsService.getTesterStats(req.user.id);
  }
}

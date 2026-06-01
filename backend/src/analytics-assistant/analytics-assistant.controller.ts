import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AnalyticsAssistantService } from './analytics-assistant.service';
import { AskAnalyticsQuestionDto } from './dto/ask-analytics-question.dto';

@UseGuards(JwtAuthGuard)
@Controller('analytics-assistant')
export class AnalyticsAssistantController {
  constructor(
    private readonly analyticsAssistantService: AnalyticsAssistantService,
  ) {}

  @Post('ask')
  ask(@Req() req: any, @Body() dto: AskAnalyticsQuestionDto) {
    return this.analyticsAssistantService.ask(dto, req.user.id, req.user.role);
  }
}

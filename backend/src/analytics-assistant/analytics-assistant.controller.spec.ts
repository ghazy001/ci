import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsAssistantController } from './analytics-assistant.controller';
import { AnalyticsAssistantService } from './analytics-assistant.service';

describe('AnalyticsAssistantController', () => {
  let controller: AnalyticsAssistantController;

  const mockAnalyticsAssistantService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsAssistantController],
      providers: [
        {
          provide: AnalyticsAssistantService,
          useValue: mockAnalyticsAssistantService,
        },
      ],
    }).compile();

    controller = module.get<AnalyticsAssistantController>(
      AnalyticsAssistantController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

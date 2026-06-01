import { Test, TestingModule } from '@nestjs/testing';
import { AnalyticsAssistantController } from './analytics-assistant.controller';

describe('AnalyticsAssistantController', () => {
  let controller: AnalyticsAssistantController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnalyticsAssistantController],
    }).compile();

    controller = module.get<AnalyticsAssistantController>(AnalyticsAssistantController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

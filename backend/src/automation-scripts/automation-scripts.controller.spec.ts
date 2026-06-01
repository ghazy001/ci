import { Test, TestingModule } from '@nestjs/testing';
import { AutomationScriptsController } from './automation-scripts.controller';
import { AutomationScriptsService } from './automation-scripts.service';

describe('AutomationScriptsController', () => {
  let controller: AutomationScriptsController;

  const mockAutomationScriptsService = {};

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationScriptsController],
      providers: [
        {
          provide: AutomationScriptsService,
          useValue: mockAutomationScriptsService,
        },
      ],
    }).compile();

    controller = module.get<AutomationScriptsController>(
      AutomationScriptsController,
    );
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

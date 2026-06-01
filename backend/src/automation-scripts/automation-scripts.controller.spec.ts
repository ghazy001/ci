import { Test, TestingModule } from '@nestjs/testing';
import { AutomationScriptsController } from './automation-scripts.controller';

describe('AutomationScriptsController', () => {
  let controller: AutomationScriptsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AutomationScriptsController],
    }).compile();

    controller = module.get<AutomationScriptsController>(AutomationScriptsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

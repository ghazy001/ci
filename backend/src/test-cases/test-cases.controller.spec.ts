import { Test, TestingModule } from '@nestjs/testing';
import { TestCasesController } from './test-cases.controller';

describe('TestCasesController', () => {
  let controller: TestCasesController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [TestCasesController],
    }).compile();

    controller = module.get<TestCasesController>(TestCasesController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});

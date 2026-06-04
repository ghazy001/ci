import { render, screen, waitFor } from "@testing-library/react";
import TestCaseGenerationPanel from "./test-case-generation-panel";
import { testCaseService } from "@/lib/test-case.service";
import { automationScriptService } from "@/lib/automation-script.service";

jest.mock("@/lib/test-case.service", () => ({
  testCaseService: {
    getByWorkItem: jest.fn(),
    getLatestGeneration: jest.fn(),
    getGenerationHistory: jest.fn(),
    generateForWorkItem: jest.fn(),
    approve: jest.fn(),
    decline: jest.fn(),
    update: jest.fn(),
    retryGeneration: jest.fn(),
    markGenerationFailed: jest.fn(),
  },
}));

jest.mock("@/lib/automation-script.service", () => ({
  automationScriptService: {
    getByTestCase: jest.fn(),
    getLatestGenerationByTestCase: jest.fn(),
    generateForTestCase: jest.fn(),
    retryGeneration: jest.fn(),
    markGenerationFailed: jest.fn(),
  },
}));

jest.mock("@/components/automation-scripts/automation-script-card", () => {
  return function MockAutomationScriptCard() {
    return <div>Mock automation script card</div>;
  };
});

jest.mock("@/components/automation-scripts/generate-script-modal", () => {
  return function MockGenerateScriptModal() {
    return <div data-testid="generate-script-modal" />;
  };
});

const mockedTestCaseService = testCaseService as jest.Mocked<typeof testCaseService>;
const mockedAutomationScriptService = automationScriptService as jest.Mocked<
  typeof automationScriptService
>;

describe("TestCaseGenerationPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    mockedTestCaseService.getByWorkItem.mockResolvedValue([
      {
        id: "tc-1",
        title: "User can login successfully",
        objective: "Verify that a valid user can login",
        expectedResult: "User is redirected to dashboard",
        status: "GENERATED",
        type: "FUNCTIONAL",
        priority: "HIGH",
        preconditions: ["User has an account"],
        steps: [
          {
            action: "Enter valid credentials",
            expected: "Credentials are accepted",
          },
        ],
        tags: ["login"],
        coverage: {
          acceptanceCriteria: ["Login works with valid credentials"],
          businessRules: [],
        },
      },
    ] as any);

    mockedTestCaseService.getLatestGeneration.mockResolvedValue(null);
    mockedTestCaseService.getGenerationHistory.mockResolvedValue([]);

    mockedAutomationScriptService.getByTestCase.mockResolvedValue([]);
    mockedAutomationScriptService.getLatestGenerationByTestCase.mockResolvedValue(null);
  });

  it("renders test cases after loading", async () => {
    render(<TestCaseGenerationPanel workItemId="work-item-123" />);

    expect(screen.getByText("Loading AI test cases…")).toBeInTheDocument();

    await waitFor(() => {
      expect(mockedTestCaseService.getByWorkItem).toHaveBeenCalledWith("work-item-123");
    });

    expect(await screen.findByText("Review Board")).toBeInTheDocument();
    expect(screen.getByText("User can login successfully")).toBeInTheDocument();
    expect(await screen.findByText("Review Board")).toBeInTheDocument();
    expect(screen.getByText("User can login successfully")).toBeInTheDocument();
    expect(screen.getByText("Pending review")).toBeInTheDocument();
    expect(screen.getByText("Automation ready")).toBeInTheDocument();
  });
});
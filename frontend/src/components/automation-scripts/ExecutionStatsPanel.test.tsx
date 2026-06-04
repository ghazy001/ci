import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExecutionStatsPanel } from "./ExecutionStatsPanel";
import { getScriptExecutionStats } from "@/lib/script-execution.service";

jest.mock("@/lib/script-execution.service", () => ({
  getScriptExecutionStats: jest.fn(),
}));

const mockedGetScriptExecutionStats = getScriptExecutionStats as jest.Mock;

describe("ExecutionStatsPanel", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("renders execution analytics after expanding the panel", async () => {
    mockedGetScriptExecutionStats.mockResolvedValue({
      total: 10,
      passed: 8,
      failed: 1,
      timedOut: 1,
      running: 0,
      queued: 0,
      passRate: 80,
      averageDurationMs: 1500,
      mostUsedBrowser: "Chrome",
      latestExecution: {
        status: "PASSED",
        createdAt: "2026-06-04T10:00:00.000Z",
      },
      latestFailedExecution: {
        status: "FAILED",
      },
    });

    render(<ExecutionStatsPanel scriptId="script-123" />);

    expect(screen.getByText("Execution Analytics")).toBeInTheDocument();

    const expandButton = screen.getByLabelText("Expand analytics");
    await userEvent.click(expandButton);

    await waitFor(() => {
      expect(getScriptExecutionStats).toHaveBeenCalledWith("script-123");
    });

    expect(await screen.findByText("Total runs")).toBeInTheDocument();
    expect(screen.getByText("Pass rate")).toBeInTheDocument();
    expect(screen.getByText("80%")).toBeInTheDocument();
    expect(screen.getByText("Chrome")).toBeInTheDocument();
    expect(screen.getByText("PASSED")).toBeInTheDocument();
  });
});
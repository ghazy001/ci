// frontend/src/app/admin/analytics-assistant/page.test.tsx

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import AdminAnalyticsAssistantPage from "./page";

import { analyticsAssistantService } from "@/lib/analytics-assistant.service";
import { getProjects } from "@/lib/project.service";

jest.mock("@/lib/analytics-assistant.service", () => ({
  analyticsAssistantService: {
    ask: jest.fn(),
  },
}));

jest.mock("@/lib/project.service", () => ({
  getProjects: jest.fn(),
}));

jest.mock("recharts", () => {
  const MockResponsiveContainer = ({
    children,
  }: {
    children: React.ReactNode;
  }) => <div data-testid="responsive-container">{children}</div>;

  MockResponsiveContainer.displayName = "MockResponsiveContainer";

  const makeChart = (name: string) => {
    function MockChart({ data }: any) {
      return <div data-testid={name} data-rows={data?.length ?? ""} />;
    }

    MockChart.displayName = `Mock${name}Chart`;

    return MockChart;
  };

  const makePrimitive = (name: string) => {
    function MockPrimitive({ dataKey, data }: any) {
      return (
        <div
          data-testid={name}
          data-datakey={dataKey ?? ""}
          data-rows={data?.length ?? ""}
        />
      );
    }

    MockPrimitive.displayName = `Mock${name}Primitive`;

    return MockPrimitive;
  };

  return {
    ResponsiveContainer: MockResponsiveContainer,

    AreaChart: makeChart("area-chart"),
    BarChart: makeChart("bar-chart"),
    LineChart: makeChart("line-chart"),
    PieChart: makeChart("pie-chart"),

    Area: makePrimitive("area"),
    Bar: makePrimitive("bar"),
    Line: makePrimitive("line"),
    Pie: makePrimitive("pie"),
    Cell: makePrimitive("cell"),
    CartesianGrid: makePrimitive("cartesian-grid"),
    Tooltip: makePrimitive("tooltip"),
    XAxis: makePrimitive("x-axis"),
    YAxis: makePrimitive("y-axis"),
  };
});

const mockProjects = [
  { id: "project-1", name: "Alpha Project" },
  { id: "project-2", name: "Beta Project" },
];

const barResponse = {
  question: "Projects with most work items",
  insight: "Alpha Project has the most work items.",
  explanation: "Grouped work items by project.",
  sql: "SELECT project_name, COUNT(*) AS total FROM work_items GROUP BY project_name ORDER BY total DESC",
  rows: [
    { project_name: "Alpha Project", total: 12 },
    { project_name: "Beta Project", total: 5 },
  ],
  chart: {
    type: "bar",
    x: "project_name",
    y: "total",
  },
  scope: {
    mode: "GLOBAL_ADMIN",
  },
};

const kpiResponse = {
  question: "Automation coverage",
  insight: "Automation coverage is 75%.",
  explanation: "Calculated automated test coverage.",
  sql: "SELECT 75 AS coverage",
  rows: [{ coverage: 75 }],
  chart: {
    type: "kpi",
    x: "",
    y: "coverage",
  },
  scope: {
    mode: "PROJECT",
  },
};

const tableResponse = {
  question: "Approved tests without scripts",
  insight: "Some approved tests do not have scripts.",
  explanation: "Listed approved tests without automation scripts.",
  sql: "SELECT title, status FROM test_cases WHERE status = 'APPROVED'",
  rows: [
    { title: "Login test", status: "APPROVED" },
    { title: "Signup test", status: "APPROVED" },
  ],
  chart: {
    type: "table",
    x: "title",
    y: "status",
  },
  scope: {
    mode: "ASSIGNED_PROJECTS",
  },
};

const emptyRowsResponse = {
  question: "AI generation failures",
  insight: "No AI generation failures were found.",
  explanation: "Checked failed AI generation jobs.",
  sql: "SELECT * FROM ai_jobs WHERE status = 'FAILED'",
  rows: [],
  chart: {
    type: "bar",
    x: "status",
    y: "count",
  },
  scope: {
    mode: "GLOBAL_ADMIN",
  },
};

function mockSuccessfulProjects() {
  (getProjects as jest.Mock).mockResolvedValue(mockProjects);
}

async function expectTextToExist(text: string | RegExp) {
  await waitFor(() => {
    expect(screen.getAllByText(text).length).toBeGreaterThan(0);
  });
}

describe("AdminAnalyticsAssistantPage", () => {
  let randomId = 0;

  beforeEach(() => {
    jest.clearAllMocks();
    randomId = 0;

    mockSuccessfulProjects();

    Object.defineProperty(global, "crypto", {
      value: {
        randomUUID: jest.fn(() => `mock-id-${++randomId}`),
      },
      configurable: true,
    });

    Element.prototype.scrollIntoView = jest.fn();
  });

  it("renders the welcome state, empty panels, and loaded projects", async () => {
    render(<AdminAnalyticsAssistantPage />);

    expect(screen.getByText("QA Analytics Assistant")).toBeInTheDocument();

    expect(screen.getAllByText("AI Analyst").length).toBeGreaterThan(0);

    expect(
      screen.getByText(/Welcome, Admin. I can analyze global QA metrics/i)
    ).toBeInTheDocument();

    expect(screen.getByText("Ask a question to see a chart")).toBeInTheDocument();
    expect(screen.getByText("SQL appears here after a query runs.")).toBeInTheDocument();

    expect(
      screen.getByText("Explanation and result table appear here after a query.")
    ).toBeInTheDocument();

    expect(await screen.findByText("Alpha Project")).toBeInTheDocument();
    expect(screen.getByText("Beta Project")).toBeInTheDocument();

    expect(getProjects).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(screen.getByRole("combobox")).toHaveValue("");
    });
  });

  it("falls back to no projects when project loading fails", async () => {
    (getProjects as jest.Mock).mockRejectedValueOnce(new Error("Failed"));

    render(<AdminAnalyticsAssistantPage />);

    await waitFor(() => {
      expect(getProjects).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText("Global analytics")).toBeInTheDocument();
    expect(screen.queryByText("Alpha Project")).not.toBeInTheDocument();
  });

  it("updates the selected project scope", async () => {
    const user = userEvent.setup();

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    await user.selectOptions(screen.getByRole("combobox"), "project-1");

    expect(screen.getByRole("combobox")).toHaveValue("project-1");

    await waitFor(() => {
      expect(screen.getAllByText(/Alpha Project/i).length).toBeGreaterThan(0);
    });
  });

  it("submits a typed question and renders the assistant response, chart, SQL, insight, and rows", async () => {
    const user = userEvent.setup();

    (analyticsAssistantService.ask as jest.Mock).mockResolvedValueOnce(barResponse);

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    const input = screen.getByPlaceholderText("Ask about QA metrics…");

    await user.type(input, "Projects with most work items{enter}");

    await expectTextToExist("Projects with most work items");

    await waitFor(() => {
      expect(analyticsAssistantService.ask).toHaveBeenCalledWith({
        question: "Projects with most work items",
        projectId: undefined,
      });
    });

    await expectTextToExist("Alpha Project has the most work items.");

    expect(screen.getByText("Generated SQL")).toBeInTheDocument();
    expect(screen.getByText("Query inspector")).toBeInTheDocument();
    expect(screen.getByText("Grouped work items by project.")).toBeInTheDocument();

    expect(screen.getByTestId("responsive-container")).toBeInTheDocument();
    expect(screen.getByTestId("bar-chart")).toBeInTheDocument();

    expect(screen.getAllByText("project_name").length).toBeGreaterThan(0);
    expect(screen.getAllByText("total").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Alpha Project").length).toBeGreaterThan(0);
    expect(screen.getAllByText("12").length).toBeGreaterThan(0);
  });

  it("submits a question with the selected project id", async () => {
    const user = userEvent.setup();

    (analyticsAssistantService.ask as jest.Mock).mockResolvedValueOnce(kpiResponse);

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    await user.selectOptions(screen.getByRole("combobox"), "project-1");

    await user.type(
      screen.getByPlaceholderText("Ask about QA metrics…"),
      "Automation coverage{enter}"
    );

    await waitFor(() => {
      expect(analyticsAssistantService.ask).toHaveBeenCalledWith({
        question: "Automation coverage",
        projectId: "project-1",
      });
    });

    await expectTextToExist("Automation coverage is 75%.");

    expect(screen.getByText("KPI Result")).toBeInTheDocument();
    expect(screen.getAllByText("75").length).toBeGreaterThan(0);
    expect(screen.getAllByText("coverage").length).toBeGreaterThan(0);
    expect(screen.getByText("Selected project")).toBeInTheDocument();
  });

  it("submits a quick prompt", async () => {
    const user = userEvent.setup();

    (analyticsAssistantService.ask as jest.Mock).mockResolvedValueOnce(tableResponse);

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    await user.click(
      screen.getByRole("button", { name: "Approved tests without scripts" })
    );

    await waitFor(() => {
      expect(analyticsAssistantService.ask).toHaveBeenCalledWith({
        question: "Approved tests without scripts",
        projectId: undefined,
      });
    });

    await expectTextToExist("Some approved tests do not have scripts.");

    expect(screen.getAllByText("Login test").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Signup test").length).toBeGreaterThan(0);
    expect(screen.getByText("Assigned projects")).toBeInTheDocument();
  });

  it("shows an API error message when asking fails", async () => {
    const user = userEvent.setup();

    (analyticsAssistantService.ask as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: "Analytics service unavailable",
        },
      },
    });

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    await user.type(
      screen.getByPlaceholderText("Ask about QA metrics…"),
      "Broken query{enter}"
    );

    expect(await screen.findByText("Analytics service unavailable")).toBeInTheDocument();
  });

  it("shows the default fallback error when asking fails without a backend message", async () => {
    const user = userEvent.setup();

    (analyticsAssistantService.ask as jest.Mock).mockRejectedValueOnce(
      new Error("Unknown")
    );

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    await user.type(
      screen.getByPlaceholderText("Ask about QA metrics…"),
      "Another query{enter}"
    );

    expect(
      await screen.findByText("I couldn't analyze that question. Please try rephrasing it.")
    ).toBeInTheDocument();
  });

  it("does not submit an empty question", async () => {
    const user = userEvent.setup();

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    const input = screen.getByPlaceholderText("Ask about QA metrics…");

    await user.type(input, "   {enter}");

    expect(analyticsAssistantService.ask).not.toHaveBeenCalled();
  });

  it("renders the no-data state when the assistant response has no rows", async () => {
    const user = userEvent.setup();

    (analyticsAssistantService.ask as jest.Mock).mockResolvedValueOnce(
      emptyRowsResponse
    );

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    await user.type(
      screen.getByPlaceholderText("Ask about QA metrics…"),
      "AI generation failures{enter}"
    );

    await expectTextToExist("No AI generation failures were found.");

    expect(screen.getByText("No data returned")).toBeInTheDocument();
    expect(screen.getByText("0 rows")).toBeInTheDocument();
  });

  it.each([
    ["bar", "bar-chart"],
    ["pie", "pie-chart"],
    ["line", "line-chart"],
    ["area", "area-chart"],
  ])("renders %s chart responses", async (chartType, testId) => {
    const user = userEvent.setup();

    (analyticsAssistantService.ask as jest.Mock).mockResolvedValueOnce({
      ...barResponse,
      question: `${chartType} chart question`,
      insight: `${chartType} chart insight`,
      chart: {
        type: chartType,
        x: "project_name",
        y: "total",
      },
    });

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    await user.type(
      screen.getByPlaceholderText("Ask about QA metrics…"),
      `${chartType} chart question{enter}`
    );

    await expectTextToExist(`${chartType} chart insight`);

    expect(screen.getByTestId(testId)).toBeInTheDocument();
  });

  it("renders a table chart response", async () => {
    const user = userEvent.setup();

    (analyticsAssistantService.ask as jest.Mock).mockResolvedValueOnce(tableResponse);

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    await user.type(
      screen.getByPlaceholderText("Ask about QA metrics…"),
      "Approved tests without scripts{enter}"
    );

    await expectTextToExist("Some approved tests do not have scripts.");

    expect(screen.getAllByText("title").length).toBeGreaterThan(0);
    expect(screen.getAllByText("status").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Login test").length).toBeGreaterThan(0);
    expect(screen.getAllByText("APPROVED").length).toBeGreaterThan(0);
  });

  it("allows selecting a previous assistant response using View chart & data", async () => {
    const user = userEvent.setup();

    const firstResponse = {
      ...barResponse,
      question: "First question",
      insight: "First insight",
      rows: [{ project_name: "First Project", total: 1 }],
    };

    const secondResponse = {
      ...kpiResponse,
      question: "Second question",
      insight: "Second insight",
      rows: [{ coverage: 99 }],
    };

    (analyticsAssistantService.ask as jest.Mock)
      .mockResolvedValueOnce(firstResponse)
      .mockResolvedValueOnce(secondResponse);

    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    const input = screen.getByPlaceholderText("Ask about QA metrics…");

    await user.type(input, "First question{enter}");
    await expectTextToExist("First insight");

    await user.type(input, "Second question{enter}");
    await expectTextToExist("Second insight");

    expect(screen.getAllByText("99").length).toBeGreaterThan(0);

    const viewButtons = screen.getAllByRole("button", {
      name: /view chart & data/i,
    });

    await user.click(viewButtons[0]);

    expect(screen.getAllByText("First question").length).toBeGreaterThan(0);
    expect(screen.getAllByText("First Project").length).toBeGreaterThan(0);
  });

  it("disables submit while the input is empty", async () => {
    render(<AdminAnalyticsAssistantPage />);

    await screen.findByText("Alpha Project");

    const inputWrapper = screen
      .getByPlaceholderText("Ask about QA metrics…")
      .closest("div") as HTMLElement;

    const sendButton = within(inputWrapper).getByRole("button");

    expect(sendButton).toBeDisabled();
  });
});
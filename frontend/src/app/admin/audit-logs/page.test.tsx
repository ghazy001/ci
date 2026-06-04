// frontend/src/app/admin/audit-logs/page.test.tsx

import React from "react";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import "@testing-library/jest-dom";

import AdminAuditLogsPage from "./page";

import {
  clearAuditLogs,
  deleteAuditLogs,
  exportAuditLogsCsv,
  exportAuditLogsExcel,
  getAuditLog,
  getAuditLogs,
  getAuditLogStats,
} from "@/lib/audit-logs.service";

jest.mock("@/lib/audit-logs.service", () => ({
  getAuditLogStats: jest.fn(),
  getAuditLogs: jest.fn(),
  getAuditLog: jest.fn(),
  exportAuditLogsCsv: jest.fn(),
  exportAuditLogsExcel: jest.fn(),
  deleteAuditLogs: jest.fn(),
  clearAuditLogs: jest.fn(),
}));

const mockStats = {
  totalToday: 12,
  failedToday: 2,
  criticalToday: 1,
  loginFailedToday: 3,
};

const mockLogs = [
  {
    id: "log-1",
    action: "LOGIN",
    entityType: "AUTH",
    severity: "INFO",
    success: true,
    message: "User logged in successfully",
    createdAt: "2026-06-04T08:30:00.000Z",
    actorName: "Ghada Saoudi",
    actorEmail: "ghada@example.com",
    actor: null,
    entityId: "auth-1",
    projectId: "project-1",
    ipAddress: "127.0.0.1",
    before: null,
    after: { status: "ok" },
    metadata: { browser: "Chrome" },
    userAgent: "Mozilla/5.0",
  },
  {
    id: "log-2",
    action: "LOGIN_FAILED",
    entityType: "AUTH",
    severity: "WARNING",
    success: false,
    message: "Invalid password",
    createdAt: "2026-06-04T09:00:00.000Z",
    actorName: "",
    actorEmail: "",
    actor: {
      fullName: "Fallback User",
      email: "fallback@example.com",
    },
    entityId: "auth-2",
    projectId: null,
    ipAddress: null,
    before: null,
    after: null,
    metadata: null,
    userAgent: null,
  },
] as any[];

function mockSuccessfulLoad(overrides?: {
  logs?: any[];
  totalPages?: number;
  total?: number;
}) {
  (getAuditLogStats as jest.Mock).mockResolvedValue(mockStats);
  (getAuditLogs as jest.Mock).mockResolvedValue({
    data: overrides?.logs ?? mockLogs,
    totalPages: overrides?.totalPages ?? 3,
    total: overrides?.total ?? mockLogs.length,
  });
}

describe("AdminAuditLogsPage", () => {
  beforeEach(() => {
    jest.clearAllMocks();

    HTMLAnchorElement.prototype.click = jest.fn();

    Object.defineProperty(window, "URL", {
      writable: true,
      value: {
        createObjectURL: jest.fn(() => "blob:mock-url"),
        revokeObjectURL: jest.fn(),
      },
    });
  });

  it("loads and renders stats and audit logs", async () => {
    mockSuccessfulLoad();

    render(<AdminAuditLogsPage />);

    expect(screen.getByText(/loading audit logs/i)).toBeInTheDocument();

    expect(await screen.findByText("Audit & Activity Logs")).toBeInTheDocument();

    expect(screen.getByText("Events Today")).toBeInTheDocument();
    expect(screen.getByText("Failed Today")).toBeInTheDocument();
    expect(screen.getByText("Critical Today")).toBeInTheDocument();
    expect(screen.getByText("Failed Logins")).toBeInTheDocument();

    expect(await screen.findByText("User logged in successfully")).toBeInTheDocument();
    expect(await screen.findByText("Invalid password")).toBeInTheDocument();

    expect(await screen.findByText("Ghada Saoudi")).toBeInTheDocument();
    expect(await screen.findByText("Fallback User")).toBeInTheDocument();

    expect(getAuditLogStats).toHaveBeenCalledTimes(1);
    expect(getAuditLogs).toHaveBeenCalledWith({
      search: "",
      action: "",
      entityType: "",
      severity: "",
      success: "",
      from: "",
      to: "",
      page: 1,
      limit: 20,
    });
  });

  it("shows an error banner when loading audit logs fails", async () => {
    const consoleSpy = jest.spyOn(console, "error").mockImplementation(() => {});

    (getAuditLogStats as jest.Mock).mockRejectedValue(new Error("Network error"));
    (getAuditLogs as jest.Mock).mockRejectedValue(new Error("Network error"));

    render(<AdminAuditLogsPage />);

    expect(
      await screen.findByText("Failed to load audit logs.")
    ).toBeInTheDocument();

    consoleSpy.mockRestore();
  });

  it("shows empty state when no audit logs are returned", async () => {
    mockSuccessfulLoad({
      logs: [],
      total: 0,
      totalPages: 1,
    });

    render(<AdminAuditLogsPage />);

    expect(await screen.findByText("No audit logs found.")).toBeInTheDocument();
    expect(screen.getByText("0 events")).toBeInTheDocument();
  });

  it("applies search and dropdown filters", async () => {
    const user = userEvent.setup();
    mockSuccessfulLoad();

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    await user.type(
      screen.getByPlaceholderText("Message, user, entity ID…"),
      "login"
    );

    const selects = screen.getAllByRole("combobox");

    await user.selectOptions(selects[0], "LOGIN");
    await user.selectOptions(selects[1], "AUTH");
    await user.selectOptions(selects[2], "INFO");
    await user.selectOptions(selects[3], "true");

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({
          search: "login",
          action: "LOGIN",
          entityType: "AUTH",
          severity: "INFO",
          success: "true",
          page: 1,
        })
      );
    });

    expect(screen.getByRole("button", { name: /clear all/i })).toBeInTheDocument();
  });

  it("resets active filters", async () => {
    const user = userEvent.setup();
    mockSuccessfulLoad();

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    await user.type(
      screen.getByPlaceholderText("Message, user, entity ID…"),
      "failed"
    );

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ search: "failed" })
      );
    });

    await user.click(screen.getByRole("button", { name: /^reset$/i }));

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith({
        search: "",
        action: "",
        entityType: "",
        severity: "",
        success: "",
        from: "",
        to: "",
        page: 1,
        limit: 20,
      });
    });
  });

  it("opens and closes audit details modal", async () => {
    const user = userEvent.setup();

    mockSuccessfulLoad();

    (getAuditLog as jest.Mock).mockResolvedValue({
      ...mockLogs[0],
      before: { old: "value" },
      after: { new: "value" },
      metadata: { source: "test" },
      userAgent: "Test Agent",
    });

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    const viewButtons = screen.getAllByRole("button", { name: /view/i });
    await user.click(viewButtons[0]);

    expect(await screen.findByText("Audit Event")).toBeInTheDocument();

    expect(
      await screen.findByRole("heading", { name: "Login" })
    ).toBeInTheDocument();

    const modal = screen.getByText("Audit Event").closest(".fixed") as HTMLElement;

    expect(within(modal).getByText("Ghada Saoudi")).toBeInTheDocument();
    expect(within(modal).getByText("User logged in successfully")).toBeInTheDocument();
    expect(within(modal).getByText("Before")).toBeInTheDocument();
    expect(within(modal).getByText("After")).toBeInTheDocument();
    expect(within(modal).getByText("Metadata")).toBeInTheDocument();
    expect(within(modal).getByText("User Agent")).toBeInTheDocument();

    const closeButton = within(modal).getAllByRole("button")[0];

    await user.click(closeButton);

    await waitFor(() => {
      expect(screen.queryByText("Audit Event")).not.toBeInTheDocument();
    });
  });

  it("exports audit logs as CSV", async () => {
    const user = userEvent.setup();
    mockSuccessfulLoad();

    const blob = new Blob(["id,message\n1,test"], { type: "text/csv" });
    (exportAuditLogsCsv as jest.Mock).mockResolvedValue(blob);

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    await user.click(screen.getByRole("button", { name: /csv/i }));

    await waitFor(() => {
      expect(exportAuditLogsCsv).toHaveBeenCalledTimes(1);
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  it("exports audit logs as Excel", async () => {
    const user = userEvent.setup();
    mockSuccessfulLoad();

    const blob = new Blob(["excel"], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });

    (exportAuditLogsExcel as jest.Mock).mockResolvedValue(blob);

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    await user.click(screen.getByRole("button", { name: /excel/i }));

    await waitFor(() => {
      expect(exportAuditLogsExcel).toHaveBeenCalledTimes(1);
      expect(window.URL.createObjectURL).toHaveBeenCalledWith(blob);
      expect(window.URL.revokeObjectURL).toHaveBeenCalledWith("blob:mock-url");
    });
  });

  it("selects a log and deletes selected logs", async () => {
    const user = userEvent.setup();
    mockSuccessfulLoad();

    (deleteAuditLogs as jest.Mock).mockResolvedValue(undefined);

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    const checkboxes = screen.getAllByRole("checkbox");
    await user.click(checkboxes[0]);

    expect(screen.getByText("1 selected")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /delete selected/i }));

    expect(screen.getByText("Delete selected logs?")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(deleteAuditLogs).toHaveBeenCalledWith(["log-1"]);
    });

    await waitFor(() => {
      expect(screen.queryByText("Delete selected logs?")).not.toBeInTheDocument();
    });
  });

  it("opens clear-all confirmation and clears audit logs", async () => {
    const user = userEvent.setup();
    mockSuccessfulLoad();

    (clearAuditLogs as jest.Mock).mockResolvedValue(undefined);

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    await user.click(screen.getByRole("button", { name: /clear all/i }));

    expect(screen.getByText("Clear all logs?")).toBeInTheDocument();
    expect(screen.getByText(/this will wipe/i)).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: /confirm delete/i }));

    await waitFor(() => {
      expect(clearAuditLogs).toHaveBeenCalledWith(
        expect.objectContaining({
          search: "",
          action: "",
          entityType: "",
          severity: "",
          success: "",
          page: 1,
        })
      );
    });
  });

  it("navigates to next and previous pages", async () => {
    const user = userEvent.setup();
    mockSuccessfulLoad({
      totalPages: 3,
      total: 30,
    });

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    await user.click(screen.getByRole("button", { name: /next/i }));

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 2 })
      );
    });

    await user.click(screen.getByRole("button", { name: /previous/i }));

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenLastCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });
  });

  it("refreshes the audit logs", async () => {
    const user = userEvent.setup();
    mockSuccessfulLoad();

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    await user.click(screen.getByRole("button", { name: /refresh/i }));

    await waitFor(() => {
      expect(getAuditLogs).toHaveBeenCalledTimes(2);
    });
  });

  it("shows clear filters button in empty state when filters are active", async () => {
    const user = userEvent.setup();

    mockSuccessfulLoad();

    render(<AdminAuditLogsPage />);

    await screen.findByText("User logged in successfully");

    await user.type(
      screen.getByPlaceholderText("Message, user, entity ID…"),
      "missing"
    );

    (getAuditLogs as jest.Mock).mockResolvedValueOnce({
      data: [],
      totalPages: 1,
      total: 0,
    });

    await user.click(screen.getByRole("button", { name: /apply filters/i }));

    expect(await screen.findByText("No audit logs found.")).toBeInTheDocument();

    const table = screen.getByRole("table");

    expect(
      within(table).getByRole("button", { name: /clear filters/i })
    ).toBeInTheDocument();
  });
});
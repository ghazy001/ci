// src/components/automation-scripts/ExecutionHistoryPanel.test.tsx

import React from 'react';
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ExecutionHistoryPanel } from './ExecutionHistoryPanel';

import {
  createDefectReportForExecution,
  createTestSuiteReport,
  downloadDefectReportPdf,
  downloadTestSuiteReportPdf,
  getDefectReportByExecution,
  getScriptExecutions,
  getTestSuiteReportsByScript,
} from '@/lib/script-execution.service';

jest.mock('@/lib/script-execution.service', () => ({
  getScriptExecutions: jest.fn(),
  getTestSuiteReportsByScript: jest.fn(),
  getDefectReportByExecution: jest.fn(),
  createDefectReportForExecution: jest.fn(),
  createTestSuiteReport: jest.fn(),
  downloadDefectReportPdf: jest.fn(),
  downloadTestSuiteReportPdf: jest.fn(),
}));

const mockExecutions = [
  {
    id: 'exec-1',
    status: 'PASSED',
    browser: 'CHROMIUM',
    environment: 'staging',
    targetUrl: 'https://example.com/login',
    command: 'npx playwright test login.spec.ts',
    startedAt: '2026-06-04T09:00:00.000Z',
    completedAt: '2026-06-04T09:00:05.000Z',
    createdAt: '2026-06-04T09:00:00.000Z',
    artifacts: [{ id: 'artifact-1' }],
  },
  {
    id: 'exec-2',
    status: 'FAILED',
    browser: 'FIREFOX',
    environment: 'production',
    targetUrl: 'https://example.com/checkout',
    command: 'npx playwright test checkout.spec.ts',
    startedAt: '2026-06-04T10:00:00.000Z',
    completedAt: '2026-06-04T10:00:08.000Z',
    createdAt: '2026-06-04T10:00:00.000Z',
    artifacts: [],
  },
  {
    id: 'exec-3',
    status: 'RUNNING',
    browser: 'WEBKIT',
    environment: 'local',
    targetUrl: 'https://example.com/profile',
    command: 'npx playwright test profile.spec.ts',
    startedAt: '2026-06-04T11:00:00.000Z',
    completedAt: null,
    createdAt: '2026-06-04T11:00:00.000Z',
    artifacts: [],
  },
];

const mockSuiteReports = [
  {
    id: 'suite-1',
    title: 'Saved suite report',
    status: 'PASSED',
    passRate: 100,
    total: 3,
    createdAt: '2026-06-04T12:00:00.000Z',
  },
];

const mockDefectReport = {
  id: 'defect-1',
  executionId: 'exec-2',
  title: 'Checkout failed',
  status: 'OPEN',
  severity: 'HIGH',
  summary: 'Checkout button is not clickable.',
  failureReason: 'Element was detached from DOM.',
  environment: 'production',
  browser: 'FIREFOX',
  targetUrl: 'https://example.com/checkout',
  exitCode: 1,
  command: 'npx playwright test checkout.spec.ts',
  stderrExcerpt: 'TimeoutError: button not clickable',
  stdoutExcerpt: 'Running checkout test',
};

describe('ExecutionHistoryPanel', () => {
  const onSelect = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (getScriptExecutions as jest.Mock).mockResolvedValue(mockExecutions);
    (getTestSuiteReportsByScript as jest.Mock).mockResolvedValue(mockSuiteReports);
    (getDefectReportByExecution as jest.Mock).mockResolvedValue(mockDefectReport);
    (createDefectReportForExecution as jest.Mock).mockResolvedValue(mockDefectReport);
    (createTestSuiteReport as jest.Mock).mockResolvedValue({
      id: 'suite-new',
      title: 'Automation Test Suite Report',
      status: 'FAILED',
      passRate: 50,
      total: 2,
      createdAt: '2026-06-04T13:00:00.000Z',
    });
    (downloadDefectReportPdf as jest.Mock).mockResolvedValue(undefined);
    (downloadTestSuiteReportPdf as jest.Mock).mockResolvedValue(undefined);
  });

  const renderPanel = async () => {
    render(
      <ExecutionHistoryPanel
        scriptId="script-1"
        refreshKey={0}
        onSelect={onSelect}
      />,
    );

    await waitFor(() => {
      expect(getScriptExecutions).toHaveBeenCalledWith('script-1');
      expect(getTestSuiteReportsByScript).toHaveBeenCalledWith('script-1');
    });

    return {
      expand: () => fireEvent.click(screen.getByLabelText('Expand history')),
    };
  };

  it('renders the collapsed header and loads data', async () => {
    await renderPanel();

    expect(screen.getByText('Execution History')).toBeInTheDocument();
    expect(screen.getByText('Recent automation runs')).toBeInTheDocument();
    expect(screen.queryByText('Latest run')).not.toBeInTheDocument();
  });

  it('expands and displays summary, saved reports, and executions', async () => {
    const panel = await renderPanel();

    panel.expand();

    expect(screen.getByText('Latest run')).toBeInTheDocument();
    expect(screen.getByText('Total runs')).toBeInTheDocument();
    expect(screen.getAllByText('Passed').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Failed').length).toBeGreaterThan(0);
    expect(screen.getByText('Active')).toBeInTheDocument();

    expect(screen.getByText('Saved suite reports')).toBeInTheDocument();
    expect(screen.getByText('Saved suite report')).toBeInTheDocument();

    expect(screen.getAllByText('https://example.com/login').length).toBeGreaterThan(0);
    expect(screen.getByText('https://example.com/checkout')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/profile')).toBeInTheDocument();
  });

  it('collapses after expanding', async () => {
    const panel = await renderPanel();

    panel.expand();

    expect(screen.getByText('Latest run')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Collapse history'));

    expect(screen.queryByText('Latest run')).not.toBeInTheDocument();
  });

  it('calls onSelect when latest run is clicked', async () => {
    const panel = await renderPanel();

    panel.expand();

    const latestRunButton = screen
      .getByText('Latest run')
      .parentElement
      ?.querySelector('button');

    expect(latestRunButton).toBeTruthy();

    fireEvent.click(latestRunButton!);

    expect(onSelect).toHaveBeenCalledWith(mockExecutions[0]);
  });

  it('calls onSelect when row details is clicked', async () => {
    const panel = await renderPanel();

    panel.expand();

    const detailsButtons = screen.getAllByRole('button', { name: /details/i });

    fireEvent.click(detailsButtons[0]);

    expect(onSelect).toHaveBeenCalledWith(mockExecutions[0]);
  });

  it('filters executions by search query', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.change(screen.getByPlaceholderText('Search URL, browser, environment…'), {
      target: { value: 'checkout' },
    });

    expect(screen.getByText('1 of 3 runs (filtered)')).toBeInTheDocument();
    expect(screen.getAllByText('https://example.com/checkout').length).toBeGreaterThan(0);
  });

  it('clears search query', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.change(screen.getByPlaceholderText('Search URL, browser, environment…'), {
      target: { value: 'checkout' },
    });

    expect(screen.getByText('1 of 3 runs (filtered)')).toBeInTheDocument();

    const clearButton = screen
      .getAllByRole('button')
      .find(
        (button) =>
          button.querySelector('svg') &&
          button.className.includes('absolute right-3'),
      );

    expect(clearButton).toBeTruthy();

    fireEvent.click(clearButton!);

    expect(screen.getByText('3 of 3 runs')).toBeInTheDocument();
  });

  it('filters executions by status', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.change(screen.getByDisplayValue('All statuses'), {
      target: { value: 'FAILED' },
    });

    expect(screen.getByText('1 of 3 runs (filtered)')).toBeInTheDocument();
    expect(screen.getAllByText('https://example.com/checkout').length).toBeGreaterThan(0);
  });

  it('shows no matching executions when filters do not match', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.change(screen.getByPlaceholderText('Search URL, browser, environment…'), {
      target: { value: 'nothing-matches-this' },
    });

    expect(screen.getByText('No executions match your filters')).toBeInTheDocument();
    expect(screen.getByText('Try clearing the search or changing the status filter')).toBeInTheDocument();
  });

  it('selects one execution for suite report and clears selection', async () => {
    const panel = await renderPanel();

    panel.expand();

    const rowCheckboxes = screen.getAllByLabelText('Select execution for suite report');

    fireEvent.click(rowCheckboxes[0]);

    const suiteReportButton = screen.getByRole('button', { name: /suite report/i });

    expect(within(suiteReportButton).getByText('1')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /clear/i }));

    expect(within(suiteReportButton).queryByText('1')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('selects all visible selectable executions', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.click(screen.getByLabelText('Select all visible executions'));

    const suiteReportButton = screen.getByRole('button', { name: /suite report/i });

    expect(within(suiteReportButton).getByText('2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /clear/i })).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Select all visible executions'));

    expect(within(suiteReportButton).queryByText('2')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /clear/i })).not.toBeInTheDocument();
  });

  it('creates a suite report from selected executions', async () => {
    const panel = await renderPanel();

    panel.expand();

    const rowCheckboxes = screen.getAllByLabelText('Select execution for suite report');

    fireEvent.click(rowCheckboxes[0]);
    fireEvent.click(rowCheckboxes[1]);

    fireEvent.click(screen.getByRole('button', { name: /suite report/i }));

    await waitFor(() => {
      expect(createTestSuiteReport).toHaveBeenCalledWith({
        executionIds: ['exec-1', 'exec-2'],
        title: 'Automation Test Suite Report',
      });
    });

    expect(screen.getByText('Suite report created')).toBeInTheDocument();

    const createdBanner = screen
      .getByText('Suite report created')
      .closest('.rounded-xl');

    expect(createdBanner).toBeTruthy();

    expect(
      within(createdBanner as HTMLElement).getByText(
        /FAILED\s*·\s*Pass rate\s*50%\s*·\s*2 total/i,
      ),
    ).toBeInTheDocument();
  });

  it('downloads created suite report PDF', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.click(screen.getAllByLabelText('Select execution for suite report')[0]);
    fireEvent.click(screen.getByRole('button', { name: /suite report/i }));

    expect(await screen.findByText('Suite report created')).toBeInTheDocument();

    const createdBanner = screen
      .getByText('Suite report created')
      .closest('.rounded-xl');

    expect(createdBanner).toBeTruthy();

    fireEvent.click(
      within(createdBanner as HTMLElement).getByRole('button', {
        name: /download pdf/i,
      }),
    );

    await waitFor(() => {
      expect(downloadTestSuiteReportPdf).toHaveBeenCalledWith('suite-new');
    });
  });

  it('downloads a saved suite report PDF', async () => {
    const panel = await renderPanel();

    panel.expand();

    const savedReportsSection = screen
      .getByText('Saved suite reports')
      .closest('div');

    expect(savedReportsSection).toBeTruthy();

    fireEvent.click(
      within(savedReportsSection as HTMLElement).getByRole('button', {
        name: /pdf/i,
      }),
    );

    await waitFor(() => {
      expect(downloadTestSuiteReportPdf).toHaveBeenCalledWith('suite-1');
    });
  });

  it('opens existing defect report for failed execution', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.click(screen.getByRole('button', { name: /bug/i }));

    expect(await screen.findByText('Defect Report')).toBeInTheDocument();
    expect(screen.getByText('Checkout failed')).toBeInTheDocument();
    expect(screen.getByText('Checkout button is not clickable.')).toBeInTheDocument();
    expect(screen.getByText('Element was detached from DOM.')).toBeInTheDocument();

    expect(getDefectReportByExecution).toHaveBeenCalledWith('exec-2');
    expect(createDefectReportForExecution).not.toHaveBeenCalled();
  });

  it('creates defect report if no existing report is found', async () => {
    (getDefectReportByExecution as jest.Mock).mockResolvedValueOnce(null);

    const panel = await renderPanel();

    panel.expand();

    fireEvent.click(screen.getByRole('button', { name: /bug/i }));

    await waitFor(() => {
      expect(createDefectReportForExecution).toHaveBeenCalledWith('exec-2');
    });

    expect(await screen.findByText('Checkout failed')).toBeInTheDocument();
  });

  it('closes defect report modal', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.click(screen.getByRole('button', { name: /bug/i }));

    expect(await screen.findByText('Defect Report')).toBeInTheDocument();

    const modalCloseButtons = screen.getAllByRole('button', { name: /close/i });

    fireEvent.click(modalCloseButtons[0]);

    expect(screen.queryByText('Defect Report')).not.toBeInTheDocument();
  });

  it('downloads defect report PDF from row action', async () => {
    const panel = await renderPanel();

    panel.expand();

    const checkoutRow = screen
      .getByText('https://example.com/checkout')
      .closest('tr');

    expect(checkoutRow).toBeTruthy();

    fireEvent.click(
      within(checkoutRow as HTMLElement).getByRole('button', {
        name: /^pdf$/i,
      }),
    );

    await waitFor(() => {
      expect(downloadDefectReportPdf).toHaveBeenCalledWith('exec-2');
    });
  });

  it('downloads defect report PDF from modal', async () => {
    const panel = await renderPanel();

    panel.expand();

    fireEvent.click(screen.getByRole('button', { name: /bug/i }));

    expect(await screen.findByText('Defect Report')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /download pdf/i }));

    await waitFor(() => {
      expect(downloadDefectReportPdf).toHaveBeenCalledWith('exec-2');
    });
  });

  it('refreshes executions when refresh button is clicked', async () => {
    await renderPanel();

    fireEvent.click(screen.getByLabelText('Refresh'));

    await waitFor(() => {
      expect(getScriptExecutions).toHaveBeenCalledTimes(2);
    });
  });

  it('shows empty state when there are no executions', async () => {
    (getScriptExecutions as jest.Mock).mockResolvedValueOnce([]);
    (getTestSuiteReportsByScript as jest.Mock).mockResolvedValueOnce([]);

    const panel = await renderPanel();

    panel.expand();

    expect(screen.getByText('No runs yet')).toBeInTheDocument();
    expect(
      screen.getByText('Run this approved script to create the first execution record.'),
    ).toBeInTheDocument();
  });

  it('shows load execution error', async () => {
    (getScriptExecutions as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Failed from API',
        },
      },
    });

    const panel = await renderPanel();

    panel.expand();

    expect(screen.getByText('Failed from API')).toBeInTheDocument();
  });

  it('shows suite report loading error', async () => {
    (getTestSuiteReportsByScript as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Suite reports failed',
        },
      },
    });

    const panel = await renderPanel();

    panel.expand();

    expect(screen.getByText('Suite reports failed')).toBeInTheDocument();
  });

  it('dismisses alert messages', async () => {
    (getScriptExecutions as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Failed from API',
        },
      },
    });

    const panel = await renderPanel();

    panel.expand();

    expect(screen.getByText('Failed from API')).toBeInTheDocument();

    const alert = screen
      .getByText('Failed from API')
      .closest('.rounded-xl');

    expect(alert).toBeTruthy();

    const dismissButton = within(alert as HTMLElement).getByRole('button');

    fireEvent.click(dismissButton);

    expect(screen.queryByText('Failed from API')).not.toBeInTheDocument();
  });

  it('shows report error when defect report cannot be loaded', async () => {
    (getDefectReportByExecution as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Bug report failed',
        },
      },
    });

    const panel = await renderPanel();

    panel.expand();

    fireEvent.click(screen.getByRole('button', { name: /bug/i }));

    expect(await screen.findByText('Bug report failed')).toBeInTheDocument();
  });

  it('shows report error when suite report creation fails', async () => {
    (createTestSuiteReport as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Suite create failed',
        },
      },
    });

    const panel = await renderPanel();

    panel.expand();

    fireEvent.click(screen.getAllByLabelText('Select execution for suite report')[0]);
    fireEvent.click(screen.getByRole('button', { name: /suite report/i }));

    expect(await screen.findByText('Suite create failed')).toBeInTheDocument();
  });
});
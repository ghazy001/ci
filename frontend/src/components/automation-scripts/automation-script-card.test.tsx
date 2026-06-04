// src/components/automation-scripts/automation-script-card.test.tsx

import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import AutomationScriptCard from './automation-script-card';

import { automationScriptService } from '@/lib/automation-script.service';
import {
  cancelScriptExecution,
  getScriptExecution,
  listenToExecutionEvents,
  runAutomationScriptLive,
} from '@/lib/script-execution.service';

jest.mock('@/lib/automation-script.service', () => ({
  automationScriptService: {
    update: jest.fn(),
    approve: jest.fn(),
    decline: jest.fn(),
    remove: jest.fn(),
  },
}));

jest.mock('@/lib/script-execution.service', () => ({
  cancelScriptExecution: jest.fn(),
  getScriptExecution: jest.fn(),
  listenToExecutionEvents: jest.fn(),
  runAutomationScriptLive: jest.fn(),
}));

jest.mock('./ExecutionDetailModal', () => ({
  ExecutionDetailModal: ({ open, execution, onClose }: any) =>
    open && execution ? (
      <div data-testid="execution-detail-modal">
        <p>Execution detail modal</p>
        <p>{execution.id}</p>
        <button type="button" onClick={onClose}>
          Close detail modal
        </button>
      </div>
    ) : null,
}));

jest.mock('./ExecutionHistoryPanel', () => ({
  ExecutionHistoryPanel: ({ scriptId, refreshKey, onSelect }: any) => (
    <div data-testid="execution-history-panel">
      <p>History for {scriptId}</p>
      <p>Refresh key {refreshKey}</p>
      <button
        type="button"
        onClick={() =>
          onSelect({
            id: 'exec-selected',
            status: 'PASSED',
            artifacts: [],
          })
        }
      >
        Select execution
      </button>
    </div>
  ),
}));

jest.mock('./ExecutionStatsPanel', () => ({
  ExecutionStatsPanel: ({ scriptId, refreshKey }: any) => (
    <div data-testid="execution-stats-panel">
      Stats for {scriptId} - {refreshKey}
    </div>
  ),
}));

jest.mock('./LiveExecutionPanel', () => ({
  LiveExecutionPanel: ({ execution, onCancel }: any) => (
    <div data-testid="live-execution-panel">
      <p>{execution ? `Live execution ${execution.id}` : 'No live execution'}</p>
      {execution && (
        <button type="button" onClick={onCancel}>
          Cancel live execution
        </button>
      )}
    </div>
  ),
}));

jest.mock('./RunExecutionModal', () => ({
  RunExecutionModal: ({ open, loading, onClose, onStart }: any) =>
    open ? (
      <div data-testid="run-execution-modal">
        <p>{loading ? 'Starting run...' : 'Run modal open'}</p>
        <button
          type="button"
          onClick={() =>
            onStart({
              browser: 'CHROMIUM',
              environment: 'staging',
              targetUrl: 'https://example.com/login',
            })
          }
        >
          Start run
        </button>
        <button type="button" onClick={onClose}>
          Close run modal
        </button>
      </div>
    ) : null,
}));

jest.mock('./ScheduledTestRunsPanel', () => ({
  ScheduledTestRunsPanel: ({ scriptId }: any) => (
    <div data-testid="scheduled-test-runs-panel">
      Scheduled runs for {scriptId}
    </div>
  ),
}));

const mockScript = {
  id: 'script-1',
  fileName: 'login.spec.ts',
  code: `import { test } from '@playwright/test';

test('login', async ({ page }) => {
  await page.goto('https://example.com/login');
});`,
  explanation: 'This script validates the login flow.',
  framework: 'PLAYWRIGHT',
  language: 'TYPESCRIPT',
  status: 'GENERATED',
  warnings: ['Selector may be unstable'],
  setupNotes: ['Install Playwright browsers'],
};

const approvedScript = {
  ...mockScript,
  status: 'APPROVED',
};

const updatedScript = {
  ...mockScript,
  fileName: 'updated-login.spec.ts',
  code: 'updated code',
  explanation: 'Updated explanation',
  status: 'EDITED',
};

const removedScript = {
  ...mockScript,
  status: 'REMOVED',
};

const liveExecution = {
  id: 'exec-live',
  status: 'RUNNING',
  artifacts: [],
};

describe('AutomationScriptCard', () => {
  const onChanged = jest.fn();
  const onRemoved = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();

    (automationScriptService.update as jest.Mock).mockResolvedValue(updatedScript);
    (automationScriptService.approve as jest.Mock).mockResolvedValue({
      ...mockScript,
      status: 'APPROVED',
    });
    (automationScriptService.decline as jest.Mock).mockResolvedValue({
      ...mockScript,
      status: 'DECLINED',
    });
    (automationScriptService.remove as jest.Mock).mockResolvedValue(removedScript);

    (runAutomationScriptLive as jest.Mock).mockResolvedValue({
      execution: liveExecution,
    });
    (listenToExecutionEvents as jest.Mock).mockReturnValue({
      close: jest.fn(),
    });
    (getScriptExecution as jest.Mock).mockResolvedValue({
      ...liveExecution,
      status: 'PASSED',
    });
    (cancelScriptExecution as jest.Mock).mockResolvedValue({
      ...liveExecution,
      status: 'CANCELED',
    });

    Object.defineProperty(URL, 'createObjectURL', {
      writable: true,
      value: jest.fn(() => 'blob:mock-url'),
    });

    Object.defineProperty(URL, 'revokeObjectURL', {
      writable: true,
      value: jest.fn(),
    });

    jest.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  const renderCard = (script: any = mockScript) => {
    render(
      <AutomationScriptCard
        script={script}
        onChanged={onChanged}
        onRemoved={onRemoved}
      />,
    );
  };

  it('renders compact script information', () => {
    renderCard();

    expect(screen.getByText('login.spec.ts')).toBeInTheDocument();
    expect(screen.getByText('Generated')).toBeInTheDocument();
    expect(screen.getByText('PLAYWRIGHT')).toBeInTheDocument();
    expect(screen.getByText('TYPESCRIPT')).toBeInTheDocument();
    expect(screen.getByText('5 lines')).toBeInTheDocument();
    expect(screen.getByText('1 warning')).toBeInTheDocument();
    expect(screen.getByText('This script validates the login flow.')).toBeInTheDocument();

    expect(screen.getByRole('button', { name: /run/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /approve/i })).toBeEnabled();
    expect(screen.getByRole('button', { name: /open/i })).toBeEnabled();
  });

  it('enables Run for approved scripts and hides Approve button', () => {
    renderCard(approvedScript);

    expect(screen.getByRole('button', { name: /run/i })).toBeEnabled();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.getByText('Approved')).toBeInTheDocument();
  });

  it('opens and closes details panel', () => {
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /open/i }));

    expect(screen.getByText('Code')).toBeInTheDocument();
    expect(screen.getByText('Runs')).toBeInTheDocument();
    expect(screen.getByText('Notes')).toBeInTheDocument();
    expect(
      screen.getByText('Details are separated into tabs so only one task is visible at a time.'),
    ).toBeInTheDocument();

    expect(screen.getAllByText('login.spec.ts').length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /^close$/i }));

    expect(
      screen.queryByText('Details are separated into tabs so only one task is visible at a time.'),
    ).not.toBeInTheDocument();
  });

  it('switches to notes tab and displays notes, setup notes, and warnings', () => {
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    fireEvent.click(screen.getByRole('button', { name: /notes/i }));

    expect(screen.getByText('Explanation')).toBeInTheDocument();
    expect(screen.getAllByText('This script validates the login flow.').length).toBeGreaterThan(0);

    expect(screen.getByText('Setup notes')).toBeInTheDocument();
    expect(screen.getByText('Install Playwright browsers')).toBeInTheDocument();

    expect(screen.getByText('Warnings')).toBeInTheDocument();
    expect(screen.getByText('Selector may be unstable')).toBeInTheDocument();
  });

  it('shows empty notes state when there are no notes', () => {
    renderCard({
      ...mockScript,
      explanation: '',
      setupNotes: [],
      warnings: [],
    });

    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    fireEvent.click(screen.getByRole('button', { name: /notes/i }));

    expect(
      screen.getByText('No notes, setup instructions, or warnings for this script.'),
    ).toBeInTheDocument();
  });

  it('opens more menu and approves script', async () => {
    renderCard();

    fireEvent.click(screen.getByLabelText('More script actions'));
    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    await waitFor(() => {
      expect(automationScriptService.approve).toHaveBeenCalledWith('script-1');
    });

    expect(onChanged).toHaveBeenCalledWith({
      ...mockScript,
      status: 'APPROVED',
    });
  });

  it('opens more menu and declines script', async () => {
    renderCard();

    fireEvent.click(screen.getByLabelText('More script actions'));
    fireEvent.click(screen.getByRole('button', { name: /decline/i }));

    await waitFor(() => {
      expect(automationScriptService.decline).toHaveBeenCalledWith('script-1');
    });

    expect(onChanged).toHaveBeenCalledWith({
      ...mockScript,
      status: 'DECLINED',
    });
  });

  it('opens more menu and removes script', async () => {
    renderCard();

    fireEvent.click(screen.getByLabelText('More script actions'));
    fireEvent.click(screen.getByRole('button', { name: /remove/i }));

    await waitFor(() => {
      expect(automationScriptService.remove).toHaveBeenCalledWith('script-1');
    });

    expect(onRemoved).toHaveBeenCalledWith(removedScript);
  });

  it('opens edit mode from more menu and saves changes', async () => {
    renderCard();

    fireEvent.click(screen.getByLabelText('More script actions'));
    fireEvent.click(screen.getByRole('button', { name: /edit script/i }));

    const textboxes = screen.getAllByRole('textbox');

    const fileNameInput = textboxes[0];
    const explanationInput = textboxes[1];
    const codeInput = textboxes[2];

    fireEvent.change(fileNameInput, {
      target: { value: 'updated-login.spec.ts' },
    });
    fireEvent.change(explanationInput, {
      target: { value: 'Updated explanation' },
    });
    fireEvent.change(codeInput, {
      target: { value: 'updated code' },
    });

    fireEvent.click(screen.getByRole('button', { name: /save changes/i }));

    await waitFor(() => {
      expect(automationScriptService.update).toHaveBeenCalledWith('script-1', {
        fileName: 'updated-login.spec.ts',
        code: 'updated code',
        explanation: 'Updated explanation',
      });
    });

    expect(onChanged).toHaveBeenCalledWith(updatedScript);
  });

  it('cancels edit mode and restores original values', () => {
    renderCard();

    fireEvent.click(screen.getByLabelText('More script actions'));
    fireEvent.click(screen.getByRole('button', { name: /edit script/i }));

    fireEvent.change(screen.getByDisplayValue('login.spec.ts'), {
      target: { value: 'changed.spec.ts' },
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(screen.queryByDisplayValue('changed.spec.ts')).not.toBeInTheDocument();
    expect(screen.getAllByText('login.spec.ts').length).toBeGreaterThan(0);
  });

  it('downloads script from more menu', () => {
    renderCard();

    fireEvent.click(screen.getByLabelText('More script actions'));
    fireEvent.click(screen.getByRole('button', { name: /download/i }));

    expect(URL.createObjectURL).toHaveBeenCalled();
    expect(HTMLAnchorElement.prototype.click).toHaveBeenCalled();
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:mock-url');
  });

  it('opens runs tab from more menu', () => {
    renderCard();

    fireEvent.click(screen.getByLabelText('More script actions'));
    fireEvent.click(screen.getByRole('button', { name: /view runs/i }));

    expect(screen.getByTestId('live-execution-panel')).toBeInTheDocument();
    expect(screen.getByTestId('scheduled-test-runs-panel')).toBeInTheDocument();
    expect(screen.getByTestId('execution-stats-panel')).toBeInTheDocument();
    expect(screen.getByTestId('execution-history-panel')).toBeInTheDocument();
  });

  it('opens notes tab from more menu', () => {
    renderCard();

    fireEvent.click(screen.getByLabelText('More script actions'));
    fireEvent.click(screen.getByRole('button', { name: /view notes/i }));

    expect(screen.getByText('Explanation')).toBeInTheDocument();
    expect(screen.getByText('Setup notes')).toBeInTheDocument();
    expect(screen.getByText('Warnings')).toBeInTheDocument();
  });

  it('opens run modal and starts live execution', async () => {
    renderCard(approvedScript);

    fireEvent.click(screen.getByRole('button', { name: /run/i }));

    expect(screen.getByTestId('run-execution-modal')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /start run/i }));

    await waitFor(() => {
      expect(runAutomationScriptLive).toHaveBeenCalledWith('script-1', {
        browser: 'CHROMIUM',
        environment: 'staging',
        targetUrl: 'https://example.com/login',
      });
    });

    expect(listenToExecutionEvents).toHaveBeenCalledWith(
      'exec-live',
      expect.any(Function),
      expect.any(Function),
    );

    expect(screen.getByTestId('live-execution-panel')).toBeInTheDocument();
    expect(screen.getByText('Live execution exec-live')).toBeInTheDocument();
  });

  it('cancels live execution', async () => {
    renderCard(approvedScript);

    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    fireEvent.click(screen.getByRole('button', { name: /start run/i }));

    expect(await screen.findByText('Live execution exec-live')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /cancel live execution/i }));

    await waitFor(() => {
      expect(cancelScriptExecution).toHaveBeenCalledWith('exec-live');
    });

    await waitFor(() => {
      expect(screen.getByText('Live execution exec-live')).toBeInTheDocument();
    });
  });

  it('opens selected execution detail modal from history panel', () => {
    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /open/i }));
    fireEvent.click(screen.getByRole('button', { name: /runs/i }));

    fireEvent.click(screen.getByRole('button', { name: /select execution/i }));

    expect(screen.getByTestId('execution-detail-modal')).toBeInTheDocument();
    expect(screen.getByText('exec-selected')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /close detail modal/i }));

    expect(screen.queryByTestId('execution-detail-modal')).not.toBeInTheDocument();
  });

  it('shows API error when approval fails', async () => {
    (automationScriptService.approve as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Approve failed',
        },
      },
    });

    renderCard();

    fireEvent.click(screen.getByRole('button', { name: /approve/i }));

    expect(await screen.findByText('Approve failed')).toBeInTheDocument();
  });

  it('shows live execution error when run fails', async () => {
    (runAutomationScriptLive as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Run failed',
        },
      },
    });

    renderCard(approvedScript);

    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    fireEvent.click(screen.getByRole('button', { name: /start run/i }));

    expect(await screen.findByText('Run failed')).toBeInTheDocument();
  });

  it('shows disconnected error when live stream disconnects', async () => {
    renderCard(approvedScript);

    fireEvent.click(screen.getByRole('button', { name: /run/i }));
    fireEvent.click(screen.getByRole('button', { name: /start run/i }));

    await waitFor(() => {
      expect(listenToExecutionEvents).toHaveBeenCalled();
    });

    const onError = (listenToExecutionEvents as jest.Mock).mock.calls[0][2];

    act(() => {
      onError();
    });

    expect(await screen.findByText('Live execution stream disconnected.')).toBeInTheDocument();
  });
});
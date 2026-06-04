// src/components/automation-scripts/ExecutionDetailModal.test.tsx

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ExecutionDetailModal } from './ExecutionDetailModal';

const mockOnClose = jest.fn();

const mockExecution = {
  id: 'exec-1',
  status: 'FAILED',
  framework: 'PLAYWRIGHT',
  browser: 'CHROMIUM',
  environment: 'staging',
  targetUrl: 'https://example.com/login',
  command: 'npx playwright test login.spec.ts',
  startedAt: '2026-06-04T09:00:00.000Z',
  completedAt: '2026-06-04T09:00:05.000Z',
  createdAt: '2026-06-04T09:00:00.000Z',
  exitCode: 1,
  errorMessage: 'Login button was not clickable.',
  stdout: 'Running login test...',
  stderr: 'TimeoutError: button not clickable',
  logs: [
    {
      timestamp: '2026-06-04T09:00:01.000Z',
      message: 'Starting browser',
    },
    {
      timestamp: '2026-06-04T09:00:02.000Z',
      message: 'Navigating to login page',
    },
  ],
  artifacts: [
    {
      id: 'artifact-1',
      type: 'SCREENSHOT',
      url: '/artifacts/screenshot.png',
    },
    {
      id: 'artifact-2',
      type: 'TRACE',
      url: '/artifacts/trace.zip',
    },
  ],
};

describe('ExecutionDetailModal', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    document.body.style.overflow = '';
    process.env.NEXT_PUBLIC_API_URL = 'https://api.example.com';
  });

  afterEach(() => {
    document.body.style.overflow = '';
  });

  it('renders nothing when closed', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open={false}
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('Execution Details')).not.toBeInTheDocument();
    });
  });

  it('renders nothing when execution is null', async () => {
    render(
      <ExecutionDetailModal
        execution={null}
        open
        onClose={mockOnClose}
      />,
    );

    await waitFor(() => {
      expect(screen.queryByText('Execution Details')).not.toBeInTheDocument();
    });
  });

  it('renders execution details when open', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Details')).toBeInTheDocument();

    expect(screen.getByText('exec-1')).toBeInTheDocument();
    expect(screen.getByText('FAILED')).toBeInTheDocument();

    expect(screen.getByText('Framework')).toBeInTheDocument();
    expect(screen.getByText('PLAYWRIGHT')).toBeInTheDocument();

    expect(screen.getByText('Browser')).toBeInTheDocument();
    expect(screen.getByText('CHROMIUM')).toBeInTheDocument();

    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('staging')).toBeInTheDocument();

    expect(screen.getByText('Exit Code')).toBeInTheDocument();
    expect(screen.getByText('1')).toBeInTheDocument();

    expect(screen.getByText('Target URL')).toBeInTheDocument();
    expect(screen.getByText('https://example.com/login')).toBeInTheDocument();

    expect(screen.getByText('Command')).toBeInTheDocument();
    expect(screen.getByText('npx playwright test login.spec.ts')).toBeInTheDocument();
  });

  it('renders duration, dates, and error message', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Details')).toBeInTheDocument();

    expect(screen.getByText('Duration')).toBeInTheDocument();
    expect(screen.getByText('5s')).toBeInTheDocument();

    expect(screen.getByText('Created')).toBeInTheDocument();
    expect(screen.getByText('Started')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();

    expect(screen.getByText('Login button was not clickable.')).toBeInTheDocument();
  });

  it('renders artifacts with full API URLs', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Artifacts')).toBeInTheDocument();

    const screenshotLink = screen.getByRole('link', { name: /screenshot/i });
    const traceLink = screen.getByRole('link', { name: /trace/i });

    expect(screenshotLink).toHaveAttribute(
      'href',
      'https://api.example.com/artifacts/screenshot.png',
    );
    expect(traceLink).toHaveAttribute(
      'href',
      'https://api.example.com/artifacts/trace.zip',
    );

    expect(screenshotLink).toHaveAttribute('target', '_blank');
    expect(traceLink).toHaveAttribute('rel', 'noreferrer');
  });

  it('renders logs, stdout, and stderr', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Logs')).toBeInTheDocument();

    expect(screen.getByText('Starting browser')).toBeInTheDocument();
    expect(screen.getByText('Navigating to login page')).toBeInTheDocument();

    expect(screen.getByText('Running login test...')).toBeInTheDocument();
    expect(screen.getByText('TimeoutError: button not clickable')).toBeInTheDocument();
  });

  it('shows fallback values when optional fields are missing', async () => {
    const minimalExecution = {
      id: 'exec-minimal',
      status: 'QUEUED',
      framework: null,
      browser: null,
      environment: null,
      targetUrl: null,
      command: null,
      startedAt: null,
      completedAt: null,
      createdAt: null,
      exitCode: null,
      errorMessage: null,
      logs: [],
      stdout: '',
      stderr: '',
      artifacts: [],
    };

    render(
      <ExecutionDetailModal
        execution={minimalExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Details')).toBeInTheDocument();

    expect(screen.getByText('exec-minimal')).toBeInTheDocument();
    expect(screen.getByText('QUEUED')).toBeInTheDocument();

    expect(screen.getAllByText('Default')).toHaveLength(2);
    expect(screen.getAllByText('—').length).toBeGreaterThan(0);
    expect(screen.getByText('No logs available.')).toBeInTheDocument();

    expect(screen.queryByText('Target URL')).not.toBeInTheDocument();
    expect(screen.queryByText('Command')).not.toBeInTheDocument();
    expect(screen.queryByText('Artifacts')).not.toBeInTheDocument();
  });

  it('calls onClose when header close button is clicked', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Details')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: /close/i });

    fireEvent.click(closeButtons[0]);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when footer close button is clicked', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Details')).toBeInTheDocument();

    const closeButtons = screen.getAllByRole('button', { name: /close/i });

    fireEvent.click(closeButtons[closeButtons.length - 1]);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when backdrop is clicked', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Details')).toBeInTheDocument();

    const backdrop = document.querySelector('.absolute.inset-0');

    expect(backdrop).toBeTruthy();

    fireEvent.click(backdrop as Element);

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape is pressed', async () => {
    render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Details')).toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });

    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while open and restores it after unmount', async () => {
    document.body.style.overflow = 'auto';

    const { unmount } = render(
      <ExecutionDetailModal
        execution={mockExecution as any}
        open
        onClose={mockOnClose}
      />,
    );

    expect(await screen.findByText('Execution Details')).toBeInTheDocument();
    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('auto');
  });
});
// src/components/automation-scripts/ScheduledTestRunsPanel.test.tsx

import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { ScheduledTestRunsPanel } from './ScheduledTestRunsPanel';

import {
  createScheduledTestRun,
  disableScheduledTestRun,
  getScheduledTestRunsByScript,
  pauseScheduledTestRun,
  resumeScheduledTestRun,
} from '@/lib/script-execution.service';

jest.mock('@/lib/script-execution.service', () => ({
  getScheduledTestRunsByScript: jest.fn(),
  createScheduledTestRun: jest.fn(),
  pauseScheduledTestRun: jest.fn(),
  resumeScheduledTestRun: jest.fn(),
  disableScheduledTestRun: jest.fn(),
}));

const mockSchedules = [
  {
    id: 'schedule-1',
    name: 'Daily login test',
    status: 'ACTIVE',
    cronExpression: '0 9 * * *',
    nextRunAt: '2026-06-05T09:00:00.000Z',
    lastRunAt: '2026-06-04T09:00:00.000Z',
    browser: 'CHROMIUM',
    environment: 'staging',
  },
  {
    id: 'schedule-2',
    name: 'Paused checkout test',
    status: 'PAUSED',
    cronExpression: '0 10 * * 5',
    nextRunAt: '2026-06-06T10:00:00.000Z',
    lastRunAt: null,
    browser: 'FIREFOX',
    environment: 'dev',
  },
];

const renderPanel = async () => {
  render(
    <ScheduledTestRunsPanel
      scriptId="script-1"
      defaultTargetUrl="https://example.com/login"
      defaultEnvironment="staging"
    />,
  );

  await waitFor(() => {
    expect(getScheduledTestRunsByScript).toHaveBeenCalledWith('script-1');
  });

  return {
    open: () => fireEvent.click(screen.getByLabelText('Expand scheduler')),
  };
};

describe('ScheduledTestRunsPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (getScheduledTestRunsByScript as jest.Mock).mockResolvedValue(mockSchedules);
  });

  it('renders the scheduler header and loads schedules', async () => {
    await renderPanel();

    expect(screen.getByText('Scheduler')).toBeInTheDocument();
    expect(screen.getByText('Scheduled test runs')).toBeInTheDocument();
    expect(getScheduledTestRunsByScript).toHaveBeenCalledWith('script-1');
  });

  it('expands and displays schedule details', async () => {
    const panel = await renderPanel();

    panel.open();

    expect(screen.getByText('Daily login test')).toBeInTheDocument();
    expect(screen.getByText('Paused checkout test')).toBeInTheDocument();
    expect(screen.getByText('2 schedules')).toBeInTheDocument();
    expect(screen.getByText('1 active')).toBeInTheDocument();
    expect(screen.getByText('1 paused')).toBeInTheDocument();
  });

  it('creates a new weekly schedule', async () => {
    const createdSchedule = {
      id: 'schedule-3',
      name: 'My new schedule',
      status: 'ACTIVE',
      cronExpression: '0 09 * * FRI',
      nextRunAt: '2026-06-12T09:00:00.000Z',
      lastRunAt: null,
      browser: 'CHROMIUM',
      environment: 'staging',
    };

    (createScheduledTestRun as jest.Mock).mockResolvedValue(createdSchedule);

    const panel = await renderPanel();

    panel.open();

    const nameInput = screen.getByPlaceholderText('My weekly smoke test');

    fireEvent.change(nameInput, {
      target: { value: 'My new schedule' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create schedule/i }));

    await waitFor(() => {
      expect(createScheduledTestRun).toHaveBeenCalledWith(
        expect.objectContaining({
          scriptId: 'script-1',
          name: 'My new schedule',
          preset: 'WEEKLY',
          dayOfWeek: 'FRI',
          time: '09:00',
          timezone: 'Africa/Tunis',
          targetUrl: 'https://example.com/login',
          browser: 'CHROMIUM',
          environment: 'staging',
        }),
      );
    });

    expect(screen.getByText('My new schedule')).toBeInTheDocument();
  });

  it('shows monthly day input when monthly preset is selected', async () => {
    const panel = await renderPanel();

    panel.open();

    const frequencySelect = screen.getByLabelText('Frequency');

    fireEvent.change(frequencySelect, {
      target: { value: 'MONTHLY' },
    });

    expect(screen.getByText('Day of month')).toBeInTheDocument();
  });

  it('shows cron expression input when custom cron preset is selected', async () => {
    const panel = await renderPanel();

    panel.open();

    const frequencySelect = screen.getByLabelText('Frequency');

    fireEvent.change(frequencySelect, {
      target: { value: 'CUSTOM_CRON' },
    });

    expect(screen.getByText('Cron expression')).toBeInTheDocument();
    expect(screen.getByDisplayValue('*/5 * * * *')).toBeInTheDocument();
  });

  it('pauses an active schedule', async () => {
    const pausedSchedule = {
      ...mockSchedules[0],
      status: 'PAUSED',
    };

    (pauseScheduledTestRun as jest.Mock).mockResolvedValue(pausedSchedule);

    const panel = await renderPanel();

    panel.open();

    const pauseButton = screen.getByRole('button', { name: /pause/i });

    fireEvent.click(pauseButton);

    await waitFor(() => {
      expect(pauseScheduledTestRun).toHaveBeenCalledWith('schedule-1');
    });
  });

  it('resumes a paused schedule', async () => {
    const resumedSchedule = {
      ...mockSchedules[1],
      status: 'ACTIVE',
    };

    (resumeScheduledTestRun as jest.Mock).mockResolvedValue(resumedSchedule);

    const panel = await renderPanel();

    panel.open();

    const resumeButtons = screen.getAllByRole('button', { name: /resume/i });

    fireEvent.click(resumeButtons[0]);

    await waitFor(() => {
      expect(resumeScheduledTestRun).toHaveBeenCalledWith('schedule-2');
    });
  });

  it('disables a schedule', async () => {
    const disabledSchedule = {
      ...mockSchedules[0],
      status: 'DISABLED',
    };

    (disableScheduledTestRun as jest.Mock).mockResolvedValue(disabledSchedule);

    const panel = await renderPanel();

    panel.open();

    const disableButtons = screen.getAllByRole('button', { name: /disable/i });

    fireEvent.click(disableButtons[0]);

    await waitFor(() => {
      expect(disableScheduledTestRun).toHaveBeenCalledWith('schedule-1');
    });
  });

  it('shows an error when schedules fail to load', async () => {
    (getScheduledTestRunsByScript as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'API error',
        },
      },
    });

    render(<ScheduledTestRunsPanel scriptId="script-1" />);

    await waitFor(() => {
      expect(getScheduledTestRunsByScript).toHaveBeenCalledWith('script-1');
    });

    fireEvent.click(screen.getByLabelText('Expand scheduler'));

    expect(screen.getByText('API error')).toBeInTheDocument();
  });

  it('shows the empty state when there are no schedules', async () => {
    (getScheduledTestRunsByScript as jest.Mock).mockResolvedValueOnce([]);

    render(<ScheduledTestRunsPanel scriptId="script-1" />);

    await waitFor(() => {
      expect(getScheduledTestRunsByScript).toHaveBeenCalledWith('script-1');
    });

    fireEvent.click(screen.getByLabelText('Expand scheduler'));

    expect(screen.getByText('No schedules yet')).toBeInTheDocument();
    expect(screen.getByText('Create your first schedule above.')).toBeInTheDocument();
  });

  it('refreshes schedules when refresh button is clicked', async () => {
    await renderPanel();

    fireEvent.click(screen.getByRole('button', { name: /refresh/i }));

    await waitFor(() => {
      expect(getScheduledTestRunsByScript).toHaveBeenCalledTimes(2);
    });
  });

  it('disables create button when schedule name is empty', async () => {
    const panel = await renderPanel();

    panel.open();

    const nameInput = screen.getByPlaceholderText('My weekly smoke test');

    fireEvent.change(nameInput, {
      target: { value: '' },
    });

    expect(screen.getByRole('button', { name: /create schedule/i })).toBeDisabled();
  });

  it('creates a monthly schedule with day of month', async () => {
    const createdSchedule = {
      id: 'schedule-4',
      name: 'Monthly schedule',
      status: 'ACTIVE',
      cronExpression: '0 09 15 * *',
      nextRunAt: '2026-06-15T09:00:00.000Z',
      lastRunAt: null,
      browser: 'CHROMIUM',
      environment: 'staging',
    };

    (createScheduledTestRun as jest.Mock).mockResolvedValue(createdSchedule);

    const panel = await renderPanel();

    panel.open();

    fireEvent.change(screen.getByLabelText('Frequency'), {
      target: { value: 'MONTHLY' },
    });

    fireEvent.change(screen.getByLabelText('Day of month'), {
      target: { value: '15' },
    });

    fireEvent.change(screen.getByPlaceholderText('My weekly smoke test'), {
      target: { value: 'Monthly schedule' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create schedule/i }));

    await waitFor(() => {
      expect(createScheduledTestRun).toHaveBeenCalledWith(
        expect.objectContaining({
          preset: 'MONTHLY',
          dayOfMonth: 15,
        }),
      );
    });

    expect(screen.getByText('Monthly schedule')).toBeInTheDocument();
  });

  it('creates a custom cron schedule', async () => {
    const createdSchedule = {
      id: 'schedule-5',
      name: 'Cron schedule',
      status: 'ACTIVE',
      cronExpression: '*/10 * * * *',
      nextRunAt: '2026-06-05T09:10:00.000Z',
      lastRunAt: null,
      browser: 'CHROMIUM',
      environment: 'staging',
    };

    (createScheduledTestRun as jest.Mock).mockResolvedValue(createdSchedule);

    const panel = await renderPanel();

    panel.open();

    fireEvent.change(screen.getByLabelText('Frequency'), {
      target: { value: 'CUSTOM_CRON' },
    });

    fireEvent.change(screen.getByLabelText('Cron expression'), {
      target: { value: '*/10 * * * *' },
    });

    fireEvent.change(screen.getByPlaceholderText('My weekly smoke test'), {
      target: { value: 'Cron schedule' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create schedule/i }));

    await waitFor(() => {
      expect(createScheduledTestRun).toHaveBeenCalledWith(
        expect.objectContaining({
          preset: 'CUSTOM_CRON',
          cronExpression: '*/10 * * * *',
        }),
      );
    });

    expect(screen.getByText('Cron schedule')).toBeInTheDocument();
  });

  it('shows create error when create request fails', async () => {
    (createScheduledTestRun as jest.Mock).mockRejectedValueOnce({
      response: {
        data: {
          message: 'Create failed',
        },
      },
    });

    const panel = await renderPanel();

    panel.open();

    fireEvent.change(screen.getByPlaceholderText('My weekly smoke test'), {
      target: { value: 'Broken schedule' },
    });

    fireEvent.click(screen.getByRole('button', { name: /create schedule/i }));

    expect(await screen.findByText('Create failed')).toBeInTheDocument();
  });

  it('navigates the mini calendar months', async () => {
    const panel = await renderPanel();

    panel.open();

    expect(screen.getByText('Upcoming')).toBeInTheDocument();

    const navigationButtons = screen
      .getAllByRole('button')
      .filter((button) => button.querySelector('svg'));

    fireEvent.click(navigationButtons[2]);

    expect(screen.getByText('Upcoming')).toBeInTheDocument();

    fireEvent.click(navigationButtons[3]);

    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });
});
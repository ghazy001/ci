// src/components/automation-scripts/RunExecutionModal.test.tsx

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import { RunExecutionModal } from './RunExecutionModal';

describe('RunExecutionModal', () => {
  const onClose = jest.fn();
  const onStart = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
    document.body.innerHTML = '';
    document.body.style.overflow = '';
  });

  const renderModal = (props?: Partial<React.ComponentProps<typeof RunExecutionModal>>) => {
    return render(
      <RunExecutionModal
        open
        loading={false}
        onClose={onClose}
        onStart={onStart}
        {...props}
      />,
    );
  };

  it('does not render when open is false', () => {
    render(
      <RunExecutionModal
        open={false}
        loading={false}
        onClose={onClose}
        onStart={onStart}
      />,
    );

    expect(screen.queryByText('Run automation script')).not.toBeInTheDocument();
  });

  it('renders modal content when open is true', async () => {
    renderModal();

    expect(await screen.findByText('Run automation script')).toBeInTheDocument();
    expect(screen.getByText('Live execution')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('Browser')).toBeInTheDocument();
    expect(screen.getByText('Environment')).toBeInTheDocument();
    expect(screen.getByText('Runtime variables')).toBeInTheDocument();
  });

  it('closes when close button is clicked', async () => {
    renderModal();

    const closeButton = await screen.findByLabelText('Close');

    fireEvent.click(closeButton);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when cancel button is clicked', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when Escape key is pressed', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.keyDown(window, {
      key: 'Escape',
      code: 'Escape',
    });

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('locks body scroll while modal is open and restores it on unmount', async () => {
    const { unmount } = renderModal();

    await screen.findByText('Run automation script');

    expect(document.body.style.overflow).toBe('hidden');

    unmount();

    expect(document.body.style.overflow).toBe('');
  });

  it('shows required error when target URL is empty', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    const targetInput = screen.getByPlaceholderText('http://host.docker.internal:3000');

    fireEvent.change(targetInput, {
      target: { value: '' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

    expect(screen.getByText('Target URL is required.')).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('shows invalid URL error when target URL is not valid', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    const targetInput = screen.getByPlaceholderText('http://host.docker.internal:3000');

    fireEvent.change(targetInput, {
      target: { value: 'not-a-url' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

    expect(screen.getByText('Target URL must be a valid URL.')).toBeInTheDocument();
    expect(onStart).not.toHaveBeenCalled();
  });

  it('starts execution with default browser and environment', async () => {
    onStart.mockResolvedValueOnce(undefined);

    renderModal();

    await screen.findByText('Run automation script');

    const targetInput = screen.getByPlaceholderText('http://host.docker.internal:3000');

    fireEvent.change(targetInput, {
      target: { value: 'https://example.com/login' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith({
        targetUrl: 'https://example.com/login',
        browser: 'CHROMIUM',
        environment: 'local',
        variables: {},
      });
    });
  });

  it('starts execution with selected browser and environment', async () => {
    onStart.mockResolvedValueOnce(undefined);

    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.change(screen.getByPlaceholderText('http://host.docker.internal:3000'), {
      target: { value: 'https://example.com' },
    });

    fireEvent.change(screen.getByDisplayValue('Chromium'), {
      target: { value: 'FIREFOX' },
    });

    fireEvent.change(screen.getByDisplayValue('Local'), {
      target: { value: 'staging' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith({
        targetUrl: 'https://example.com',
        browser: 'FIREFOX',
        environment: 'staging',
        variables: {},
      });
    });
  });

  it('shows empty runtime variables state when manage is clicked', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.click(screen.getByRole('button', { name: /manage/i }));

    expect(
      screen.getByText(
        'No variables yet. Add one when the script needs credentials or dynamic values.',
      ),
    ).toBeInTheDocument();
  });

  it('adds and removes a runtime variable row', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    expect(screen.getByPlaceholderText('KEY')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('value')).toBeInTheDocument();

    fireEvent.click(screen.getByLabelText('Remove variable'));

    expect(screen.queryByPlaceholderText('KEY')).not.toBeInTheDocument();
  });

  it('includes runtime variables in the start payload', async () => {
    onStart.mockResolvedValueOnce(undefined);

    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.change(screen.getByPlaceholderText('http://host.docker.internal:3000'), {
      target: { value: 'https://example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    fireEvent.change(screen.getByPlaceholderText('KEY'), {
      target: { value: 'EMAIL' },
    });

    fireEvent.change(screen.getByPlaceholderText('value'), {
      target: { value: 'tester@example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith({
        targetUrl: 'https://example.com',
        browser: 'CHROMIUM',
        environment: 'local',
        variables: {
          EMAIL: 'tester@example.com',
        },
      });
    });
  });

  it('ignores runtime variables with empty keys', async () => {
    onStart.mockResolvedValueOnce(undefined);

    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.change(screen.getByPlaceholderText('http://host.docker.internal:3000'), {
      target: { value: 'https://example.com' },
    });

    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    fireEvent.change(screen.getByPlaceholderText('value'), {
      target: { value: 'should-be-ignored' },
    });

    fireEvent.click(screen.getByRole('button', { name: /^start$/i }));

    await waitFor(() => {
      expect(onStart).toHaveBeenCalledWith({
        targetUrl: 'https://example.com',
        browser: 'CHROMIUM',
        environment: 'local',
        variables: {},
      });
    });
  });

  it('shows active variable count when a variable key is provided', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    fireEvent.change(screen.getByPlaceholderText('KEY'), {
      target: { value: 'TOKEN' },
    });

    expect(screen.getByText('1 active')).toBeInTheDocument();
  });

  it('uses password input type for secret-like variable keys', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.click(screen.getByRole('button', { name: /add/i }));

    const keyInput = screen.getByPlaceholderText('KEY');
    const valueInput = screen.getByPlaceholderText('value');

    expect(valueInput).toHaveAttribute('type', 'text');

    fireEvent.change(keyInput, {
      target: { value: 'PASSWORD' },
    });

    expect(screen.getByPlaceholderText('value')).toHaveAttribute('type', 'password');
  });

  it('hides and shows runtime variables panel', async () => {
    renderModal();

    await screen.findByText('Run automation script');

    fireEvent.click(screen.getByRole('button', { name: /manage/i }));

    expect(
      screen.getByText(
        'No variables yet. Add one when the script needs credentials or dynamic values.',
      ),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /hide/i }));

    expect(
      screen.queryByText(
        'No variables yet. Add one when the script needs credentials or dynamic values.',
      ),
    ).not.toBeInTheDocument();
  });

  it('does not close from Escape key while loading', async () => {
    renderModal({
      loading: true,
    });

    await screen.findByText('Run automation script');

    fireEvent.keyDown(window, {
      key: 'Escape',
      code: 'Escape',
    });

    expect(onClose).not.toHaveBeenCalled();
  });

  it('disables close, cancel, manage, add, and start buttons while loading', async () => {
    renderModal({
      loading: true,
    });

    await screen.findByText('Run automation script');

    expect(screen.getByLabelText('Close')).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /manage/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /add/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /starting/i })).toBeDisabled();
  });
});
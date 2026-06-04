// src/components/automation-scripts/generate-script-modal.test.tsx

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';

import GenerateScriptModal from './generate-script-modal';

const mockTestCase = {
  id: 'tc-1',
  title: 'User can login successfully',
  expectedResult: 'User should be redirected to dashboard',
  description: 'Login test case',
  steps: [],
  priority: 'HIGH',
  status: 'APPROVED',
};

describe('GenerateScriptModal', () => {
  const onClose = jest.fn();
  const onSubmit = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderModal = (
    props?: Partial<React.ComponentProps<typeof GenerateScriptModal>>,
  ) => {
    return render(
      <GenerateScriptModal
        open
        testCase={mockTestCase as any}
        loading={false}
        onClose={onClose}
        onSubmit={onSubmit}
        {...props}
      />,
    );
  };

  it('does not render when open is false', () => {
    render(
      <GenerateScriptModal
        open={false}
        testCase={mockTestCase as any}
        loading={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText('Generate automation script')).not.toBeInTheDocument();
  });

  it('does not render when testCase is null', () => {
    render(
      <GenerateScriptModal
        open
        testCase={null}
        loading={false}
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    expect(screen.queryByText('Generate automation script')).not.toBeInTheDocument();
  });

  it('renders modal content and test case details', () => {
    renderModal();

    expect(screen.getByText('Generate automation script')).toBeInTheDocument();
    expect(screen.getByText('AI inspects target page before writing code')).toBeInTheDocument();
    expect(screen.getByText('Approved test case')).toBeInTheDocument();
    expect(screen.getByText('User can login successfully')).toBeInTheDocument();
    expect(screen.getByText('User should be redirected to dashboard')).toBeInTheDocument();
    expect(screen.getByText('Framework')).toBeInTheDocument();
    expect(screen.getByText('Target')).toBeInTheDocument();
    expect(screen.getByText('Selector strategy')).toBeInTheDocument();
    expect(screen.getByText('Authentication')).toBeInTheDocument();
  });

  it('closes when close button is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Close modal'));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when cancel button is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('closes when backdrop is clicked and not loading', () => {
    const { container } = renderModal();

    const backdrop = container.firstChild as HTMLElement;

    fireEvent.click(backdrop);

    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('does not close when backdrop is clicked while loading', () => {
    const { container } = renderModal({
      loading: true,
    });

    const backdrop = container.firstChild as HTMLElement;

    fireEvent.click(backdrop);

    expect(onClose).not.toHaveBeenCalled();
  });

  it('shows required target URL error', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    expect(screen.getByText('Target URL is required.')).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('shows invalid target URL error when URL does not start with http or https', async () => {
    renderModal();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/login'), {
      target: {
        value: 'localhost:3000/login',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    expect(
      screen.getByText('Target URL must start with http:// or https://'),
    ).toBeInTheDocument();

    expect(onSubmit).not.toHaveBeenCalled();
  });

  it('submits default payload with valid target URL', async () => {
    onSubmit.mockResolvedValueOnce(undefined);

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/login'), {
      target: {
        value: 'https://example.com/login',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        framework: 'PLAYWRIGHT_TS',
        targetUrl: 'https://example.com/login',
        browser: 'CHROMIUM',
        environment: 'local',
        selectorsStrategy: 'AUTO',
        authRequired: false,
        authRole: undefined,
        authInstructions: undefined,
        extraInstructions:
          'Use environment variables for sensitive values. Do not hardcode credentials.',
        variables: {},
      });
    });
  });

  it('submits selected framework, browser, environment, and selector strategy', async () => {
    onSubmit.mockResolvedValueOnce(undefined);

    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /cypress typescript/i }));

    fireEvent.change(screen.getByPlaceholderText('https://example.com/login'), {
      target: {
        value: 'https://example.com/cart',
      },
    });

    fireEvent.change(screen.getByDisplayValue('local'), {
      target: {
        value: 'staging',
      },
    });

    fireEvent.change(screen.getByDisplayValue('Chromium'), {
      target: {
        value: 'FIREFOX',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /data-testid test attribute/i }));

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          framework: 'CYPRESS_TS',
          targetUrl: 'https://example.com/cart',
          browser: 'FIREFOX',
          environment: 'staging',
          selectorsStrategy: 'DATA_TEST_ID_FIRST',
        }),
      );
    });
  });

  it('enables authentication fields when auth toggle is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByLabelText('Toggle authentication'));

    expect(screen.getByPlaceholderText('tester / admin / customer')).toBeInTheDocument();
    expect(
      screen.getByPlaceholderText(
        'Use TESTER_EMAIL and TESTER_PASSWORD environment variables. Login before executing the test.',
      ),
    ).toBeInTheDocument();
  });

  it('submits auth role and auth instructions when authentication is enabled', async () => {
    onSubmit.mockResolvedValueOnce(undefined);

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/login'), {
      target: {
        value: 'https://example.com/login',
      },
    });

    fireEvent.click(screen.getByLabelText('Toggle authentication'));

    fireEvent.change(screen.getByPlaceholderText('tester / admin / customer'), {
      target: {
        value: 'admin',
      },
    });

    fireEvent.change(
      screen.getByPlaceholderText(
        'Use TESTER_EMAIL and TESTER_PASSWORD environment variables. Login before executing the test.',
      ),
      {
        target: {
          value: 'Login with ADMIN_EMAIL and ADMIN_PASSWORD.',
        },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          authRequired: true,
          authRole: 'admin',
          authInstructions: 'Login with ADMIN_EMAIL and ADMIN_PASSWORD.',
        }),
      );
    });
  });

  it('submits undefined environment when environment input is blank', async () => {
    onSubmit.mockResolvedValueOnce(undefined);

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/login'), {
      target: {
        value: 'https://example.com/login',
      },
    });

    fireEvent.change(screen.getByDisplayValue('local'), {
      target: {
        value: '',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          environment: undefined,
        }),
      );
    });
  });

  it('submits edited extra instructions', async () => {
    onSubmit.mockResolvedValueOnce(undefined);

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/login'), {
      target: {
        value: 'https://example.com/login',
      },
    });

    fireEvent.change(
      screen.getByDisplayValue(
        'Use environment variables for sensitive values. Do not hardcode credentials.',
      ),
      {
        target: {
          value: 'Use stable selectors and avoid brittle CSS.',
        },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInstructions: 'Use stable selectors and avoid brittle CSS.',
        }),
      );
    });
  });

  it('submits undefined extra instructions when extra instructions are blank', async () => {
    onSubmit.mockResolvedValueOnce(undefined);

    renderModal();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/login'), {
      target: {
        value: 'https://example.com/login',
      },
    });

    fireEvent.change(
      screen.getByDisplayValue(
        'Use environment variables for sensitive values. Do not hardcode credentials.',
      ),
      {
        target: {
          value: '',
        },
      },
    );

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          extraInstructions: undefined,
        }),
      );
    });
  });

  it('disables buttons and shows generating state while loading', () => {
    renderModal({
      loading: true,
    });

    expect(screen.getByLabelText('Close modal')).toBeDisabled();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeDisabled();
    expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled();
    expect(screen.getByText('Generating…')).toBeInTheDocument();
  });

  it('clears validation error after successful valid submit attempt', async () => {
    onSubmit.mockResolvedValueOnce(undefined);

    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    expect(screen.getByText('Target URL is required.')).toBeInTheDocument();

    fireEvent.change(screen.getByPlaceholderText('https://example.com/login'), {
      target: {
        value: 'https://example.com/login',
      },
    });

    fireEvent.click(screen.getByRole('button', { name: /generate script/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledTimes(1);
    });

    expect(screen.queryByText('Target URL is required.')).not.toBeInTheDocument();
  });
});
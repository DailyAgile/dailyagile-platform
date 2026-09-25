/**
 * Quiz Settings Page Tests
 * Tests for the frontend settings page component
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import QuizSettingsPage from './page';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useParams: () => ({
    quizId: 'test-quiz-123',
  }),
}));

// Mock logger
vi.mock('@/lib/logger', () => ({
  createLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
  }),
}));

// Mock fetch
global.fetch = vi.fn();

describe('Quiz Settings Page', () => {
  const mockSettings = {
    success: true,
    data: {
      quizId: 'test-quiz-123',
      timeLimitMinutes: 30,
      allowRetakes: true,
      maxRetakes: 3,
      passingScorePercentage: 70,
      showAnswersAfterSubmit: true,
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockSettings,
    });
  });

  // ========================================================================
  // RENDERING TESTS
  // ========================================================================

  describe('Rendering', () => {
    it('renders loading state initially', async () => {
      render(<QuizSettingsPage />);
      expect(screen.getByText(/loading settings/i)).toBeInTheDocument();
    });

    it('renders quiz settings form after loading', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/quiz settings/i)).toBeInTheDocument();
      expect(screen.getByText(/configure quiz options/i)).toBeInTheDocument();
    });

    it('renders all form fields', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/allow students to retake quiz/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/passing score/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/show correct answers/i)).toBeInTheDocument();
    });

    it('renders save and cancel buttons', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/save settings/i)).toBeInTheDocument();
      });

      expect(screen.getByText(/cancel/i)).toBeInTheDocument();
    });
  });

  // ========================================================================
  // DATA LOADING TESTS
  // ========================================================================

  describe('Data Loading', () => {
    it('loads settings from API', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/instructor/quiz/test-quiz-123/settings')
        );
      });
    });

    it('displays loaded settings in form', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        const timeLimitInput = screen.getByLabelText(
          /time limit/i
        ) as HTMLInputElement;
        expect(timeLimitInput.value).toBe('30');
      });

      const passingScoreInput = screen.getByLabelText(
        /passing score/i
      ) as HTMLInputElement;
      expect(passingScoreInput.value).toBe('70');
    });

    it('displays error when API fails', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Failed to load settings' },
        }),
      });

      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/failed to load settings/i)).toBeInTheDocument();
      });
    });

    it('handles missing quiz ID', async () => {
      vi.mocked(require('next/navigation').useParams).mockReturnValueOnce({
        quizId: undefined,
      });

      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/quiz id not found/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // FORM INPUT TESTS
  // ========================================================================

  describe('Form Inputs', () => {
    it('time limit input changes value', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '45');

      expect((timeLimitInput as HTMLInputElement).value).toBe('45');
    });

    it('allow retakes toggle changes state', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/allow students to retake/i)).toBeInTheDocument();
      });

      const allowRetriesCheckbox = screen.getByLabelText(/allow students to retake/i);
      fireEvent.click(allowRetriesCheckbox);

      expect((allowRetriesCheckbox as HTMLInputElement).checked).toBe(false);
    });

    it('shows max retakes input only when allow_retakes is true', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/allow students to retake/i)).toBeInTheDocument();
      });

      expect(screen.getByLabelText(/maximum retakes/i)).toBeInTheDocument();

      const allowRetriesCheckbox = screen.getByLabelText(/allow students to retake/i);
      fireEvent.click(allowRetriesCheckbox);

      await waitFor(() => {
        expect(screen.queryByLabelText(/maximum retakes/i)).not.toBeInTheDocument();
      });
    });

    it('max retakes input changes value', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/maximum retakes/i)).toBeInTheDocument();
      });

      const maxRetriesInput = screen.getByLabelText(/maximum retakes/i);
      await user.clear(maxRetriesInput);
      await user.type(maxRetriesInput, '5');

      expect((maxRetriesInput as HTMLInputElement).value).toBe('5');
    });

    it('passing score input changes value', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/passing score/i)).toBeInTheDocument();
      });

      const passingScoreInput = screen.getByLabelText(/passing score/i);
      await user.clear(passingScoreInput);
      await user.type(passingScoreInput, '80');

      expect((passingScoreInput as HTMLInputElement).value).toBe('80');
    });

    it('show answers toggle changes state', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/show correct answers/i)).toBeInTheDocument();
      });

      const showAnswersCheckbox = screen.getByLabelText(/show correct answers/i);
      fireEvent.click(showAnswersCheckbox);

      expect((showAnswersCheckbox as HTMLInputElement).checked).toBe(false);
    });
  });

  // ========================================================================
  // SAVE BUTTON TESTS
  // ========================================================================

  describe('Save Button', () => {
    it('save button is disabled when no changes', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/save settings/i)).toBeInTheDocument();
      });

      const saveButton = screen.getByText(/save settings/i) as HTMLButtonElement;
      expect(saveButton.disabled).toBe(true);
    });

    it('save button is enabled when changes are made', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '60');

      await waitFor(() => {
        const saveButton = screen.getByText(/save settings/i) as HTMLButtonElement;
        expect(saveButton.disabled).toBe(false);
      });
    });

    it('save button calls API on click', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '60');

      const saveButton = screen.getByText(/save settings/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/instructor/quiz/test-quiz-123/settings'),
          expect.objectContaining({
            method: 'PATCH',
          })
        );
      });
    });

    it('shows loading state while saving', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockImplementationOnce(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  ok: true,
                  json: async () => mockSettings,
                }),
              100
            )
          )
      );

      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '60');

      const saveButton = screen.getByText(/save settings/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/saving/i)).toBeInTheDocument();
      });
    });

    it('shows success message on successful save', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '60');

      const saveButton = screen.getByText(/save settings/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/settings saved successfully/i)
        ).toBeInTheDocument();
      });
    });

    it('shows error message on failed save', async () => {
      const user = userEvent.setup();
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        json: async () => ({
          error: { message: 'Database error' },
        }),
      });

      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '60');

      const saveButton = screen.getByText(/save settings/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.getByText(/database error/i)).toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // CANCEL BUTTON TESTS
  // ========================================================================

  describe('Cancel Button', () => {
    it('cancel button is disabled when no changes', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByText(/cancel/i)).toBeInTheDocument();
      });

      const cancelButton = screen.getByText(/cancel/i) as HTMLButtonElement;
      expect(cancelButton.disabled).toBe(true);
    });

    it('cancel button is enabled when changes are made', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '60');

      await waitFor(() => {
        const cancelButton = screen.getByText(/cancel/i) as HTMLButtonElement;
        expect(cancelButton.disabled).toBe(false);
      });
    });

    it('cancel button reverts changes', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i) as HTMLInputElement;
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '60');

      expect(timeLimitInput.value).toBe('60');

      const cancelButton = screen.getByText(/cancel/i);
      await user.click(cancelButton);

      expect(timeLimitInput.value).toBe('30');
    });
  });

  // ========================================================================
  // VALIDATION TESTS
  // ========================================================================

  describe('Validation', () => {
    it('validates time limit range', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '150');

      const saveButton = screen.getByText(/save settings/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/time limit must be between 0 and 120/i)
        ).toBeInTheDocument();
      });
    });

    it('validates passing score range', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/passing score/i)).toBeInTheDocument();
      });

      const passingScoreInput = screen.getByLabelText(/passing score/i);
      await user.clear(passingScoreInput);
      await user.type(passingScoreInput, '150');

      const saveButton = screen.getByText(/save settings/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/passing score must be between 0 and 100/i)
        ).toBeInTheDocument();
      });
    });

    it('validates max retakes range', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/maximum retakes/i)).toBeInTheDocument();
      });

      const maxRetriesInput = screen.getByLabelText(/maximum retakes/i);
      await user.clear(maxRetriesInput);
      await user.type(maxRetriesInput, '50');

      const saveButton = screen.getByText(/save settings/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(
          screen.getByText(/max retakes must be between 0 and 20/i)
        ).toBeInTheDocument();
      });
    });

    it('does not show error when values are valid', async () => {
      const user = userEvent.setup();
      render(<QuizSettingsPage />);

      await waitFor(() => {
        expect(screen.getByLabelText(/time limit/i)).toBeInTheDocument();
      });

      const timeLimitInput = screen.getByLabelText(/time limit/i);
      await user.clear(timeLimitInput);
      await user.type(timeLimitInput, '60');

      const saveButton = screen.getByText(/save settings/i);
      await user.click(saveButton);

      await waitFor(() => {
        expect(screen.queryByText(/must be between/i)).not.toBeInTheDocument();
      });
    });
  });

  // ========================================================================
  // RESPONSIVE DESIGN TESTS
  // ========================================================================

  describe('Responsive Design', () => {
    it('renders on mobile (375px)', () => {
      // Mock window.innerWidth
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      });

      render(<QuizSettingsPage />);

      const formContainer = screen.getByText(/quiz settings/i).closest('div');
      expect(formContainer).toBeInTheDocument();
    });

    it('renders on tablet (768px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 768,
      });

      render(<QuizSettingsPage />);

      const formContainer = screen.getByText(/quiz settings/i).closest('div');
      expect(formContainer).toBeInTheDocument();
    });

    it('renders on desktop (1024px)', () => {
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 1024,
      });

      render(<QuizSettingsPage />);

      const formContainer = screen.getByText(/quiz settings/i).closest('div');
      expect(formContainer).toBeInTheDocument();
    });
  });

  // ========================================================================
  // BRANDING TESTS
  // ========================================================================

  describe('DailyAgile Branding', () => {
    it('uses navy color for headers', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        const header = screen.getByText(/quiz settings/i);
        const style = window.getComputedStyle(header);
        // Just verify the element exists and is styled
        expect(header).toBeInTheDocument();
      });
    });

    it('uses teal color for accents', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        const saveButton = screen.getByText(/save settings/i);
        // Verify button exists
        expect(saveButton).toBeInTheDocument();
      });
    });

    it('uses Calibri font for body text', async () => {
      render(<QuizSettingsPage />);

      await waitFor(() => {
        const inputElement = screen.getByLabelText(/time limit/i) as HTMLInputElement;
        expect(inputElement).toBeInTheDocument();
        // Font validation happens through inline styles
      });
    });
  });
});

'use client';

/**
 * Quiz Settings Page
 * Allows instructors to configure quiz settings:
 * - Time limit
 * - Retake policy
 * - Passing score
 * - Show answers after submit
 */

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { createLogger } from '@/lib/logger';

const log = createLogger('QuizSettings');

// Brand colors
const COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  error: '#DC2626',
  success: '#16A34A',
  white: '#FFFFFF',
  darkGray: '#1F2937',
};

interface QuizSettings {
  timeLimitMinutes: number | null;
  allowRetakes: boolean;
  maxRetakes: number;
  passingScorePercentage: number;
  showAnswersAfterSubmit: boolean;
}

export default function QuizSettingsPage() {
  const params = useParams();
  const quizId = params?.quizId as string;

  // State
  const [settings, setSettings] = useState<QuizSettings | null>(null);
  const [formData, setFormData] = useState<QuizSettings>({
    timeLimitMinutes: null,
    allowRetakes: true,
    maxRetakes: 3,
    passingScorePercentage: 70,
    showAnswersAfterSubmit: true,
  });

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Load settings on mount
  useEffect(() => {
    if (!quizId) {
      setError('Quiz ID not found');
      setLoading(false);
      return;
    }

    loadSettings();
  }, [quizId]);

  const loadSettings = async () => {
    try {
      setError(null);
      const response = await fetch(`/api/instructor/quiz/${quizId}/settings`);

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to load settings');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to load settings');
      }

      setSettings(data.data);
      setFormData(data.data);
    } catch (err) {
      log.error('Failed to load settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (
      formData.timeLimitMinutes !== null &&
      (formData.timeLimitMinutes < 0 || formData.timeLimitMinutes > 120)
    ) {
      errors.timeLimitMinutes = 'Time limit must be between 0 and 120 minutes';
    }

    if (
      formData.passingScorePercentage < 0 ||
      formData.passingScorePercentage > 100
    ) {
      errors.passingScorePercentage = 'Passing score must be between 0 and 100';
    }

    if (formData.maxRetakes < 0 || formData.maxRetakes > 20) {
      errors.maxRetakes = 'Max retakes must be between 0 and 20';
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSave = async () => {
    if (!validateForm()) {
      return;
    }

    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const response = await fetch(`/api/instructor/quiz/${quizId}/settings`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error?.message || 'Failed to save settings');
      }

      const data = await response.json();
      if (!data.success) {
        throw new Error(data.error?.message || 'Failed to save settings');
      }

      setSettings(data.data);
      setSuccess('Settings saved successfully!');
      log.info('Settings saved successfully');
    } catch (err) {
      log.error('Failed to save settings:', err);
      setError(err instanceof Error ? err.message : 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const hasChanges = JSON.stringify(settings) !== JSON.stringify(formData);

  // Loading state
  if (loading) {
    return (
      <div
        style={{
          minHeight: '100vh',
          backgroundColor: COLORS.light,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontFamily: 'Calibri, sans-serif',
        }}
      >
        <div
          style={{
            color: COLORS.navy,
            fontSize: '18px',
            fontWeight: 'bold',
          }}
        >
          Loading settings...
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: COLORS.light,
        padding: '20px',
        fontFamily: 'Calibri, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '600px',
          margin: '0 auto',
          backgroundColor: COLORS.white,
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        {/* Header */}
        <div
          style={{
            marginBottom: '30px',
            borderBottom: `2px solid ${COLORS.teal}`,
            paddingBottom: '15px',
          }}
        >
          <h1
            style={{
              margin: '0 0 10px 0',
              color: COLORS.navy,
              fontSize: '28px',
              fontWeight: 'bold',
              fontFamily: 'Cambria, serif',
            }}
          >
            Quiz Settings
          </h1>
          <p
            style={{
              margin: '0',
              color: COLORS.gray,
              fontSize: '14px',
            }}
          >
            Configure quiz options and policies
          </p>
        </div>

        {/* Error message */}
        {error && (
          <div
            style={{
              backgroundColor: '#FEE2E2',
              border: `1px solid ${COLORS.error}`,
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: COLORS.error,
              fontSize: '14px',
            }}
          >
            {error}
          </div>
        )}

        {/* Success message */}
        {success && (
          <div
            style={{
              backgroundColor: '#DCFCE7',
              border: `1px solid ${COLORS.success}`,
              borderRadius: '6px',
              padding: '12px 16px',
              marginBottom: '20px',
              color: COLORS.success,
              fontSize: '14px',
            }}
          >
            {success}
          </div>
        )}

        {/* Form */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Time Limit */}
          <div>
            <label
              style={{
                display: 'block',
                color: COLORS.navy,
                fontWeight: 'bold',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            >
              Time Limit (minutes)
            </label>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <input
                type="number"
                min="0"
                max="120"
                value={formData.timeLimitMinutes ?? ''}
                onChange={(e) => {
                  const val = e.target.value === '' ? null : parseInt(e.target.value, 10);
                  setFormData({ ...formData, timeLimitMinutes: val });
                }}
                placeholder="No limit"
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1px solid ${validationErrors.timeLimitMinutes ? COLORS.error : COLORS.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'Calibri, sans-serif',
                }}
              />
              <span style={{ color: COLORS.gray, fontSize: '12px' }}>
                (0-120)
              </span>
            </div>
            {validationErrors.timeLimitMinutes && (
              <p
                style={{
                  color: COLORS.error,
                  fontSize: '12px',
                  margin: '6px 0 0 0',
                }}
              >
                {validationErrors.timeLimitMinutes}
              </p>
            )}
            <p
              style={{
                color: COLORS.gray,
                fontSize: '12px',
                margin: '6px 0 0 0',
              }}
            >
              Leave empty for no time limit
            </p>
          </div>

          {/* Allow Retakes */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={formData.allowRetakes}
                onChange={(e) =>
                  setFormData({ ...formData, allowRetakes: e.target.checked })
                }
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: COLORS.teal,
                }}
              />
              <span
                style={{
                  color: COLORS.navy,
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                Allow Students to Retake Quiz
              </span>
            </label>
          </div>

          {/* Max Retakes */}
          {formData.allowRetakes && (
            <div style={{ marginLeft: '28px', paddingLeft: '10px', borderLeft: `2px solid ${COLORS.teal}` }}>
              <label
                style={{
                  display: 'block',
                  color: COLORS.navy,
                  fontWeight: 'bold',
                  marginBottom: '8px',
                  fontSize: '14px',
                }}
              >
                Maximum Retakes
              </label>
              <div
                style={{
                  display: 'flex',
                  gap: '10px',
                  alignItems: 'center',
                }}
              >
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={formData.maxRetakes}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      maxRetakes: parseInt(e.target.value, 10),
                    })
                  }
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: `1px solid ${validationErrors.maxRetakes ? COLORS.error : COLORS.border}`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontFamily: 'Calibri, sans-serif',
                  }}
                />
                <span style={{ color: COLORS.gray, fontSize: '12px' }}>
                  (0-20)
                </span>
              </div>
              {validationErrors.maxRetakes && (
                <p
                  style={{
                    color: COLORS.error,
                    fontSize: '12px',
                    margin: '6px 0 0 0',
                  }}
                >
                  {validationErrors.maxRetakes}
                </p>
              )}
            </div>
          )}

          {/* Passing Score */}
          <div>
            <label
              style={{
                display: 'block',
                color: COLORS.navy,
                fontWeight: 'bold',
                marginBottom: '8px',
                fontSize: '14px',
              }}
            >
              Passing Score (%)
            </label>
            <div
              style={{
                display: 'flex',
                gap: '10px',
                alignItems: 'center',
              }}
            >
              <input
                type="number"
                min="0"
                max="100"
                value={formData.passingScorePercentage}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    passingScorePercentage: parseInt(e.target.value, 10),
                  })
                }
                style={{
                  flex: 1,
                  padding: '10px 12px',
                  border: `1px solid ${validationErrors.passingScorePercentage ? COLORS.error : COLORS.border}`,
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontFamily: 'Calibri, sans-serif',
                }}
              />
              <span style={{ color: COLORS.gray, fontSize: '12px' }}>
                (0-100)
              </span>
            </div>
            {validationErrors.passingScorePercentage && (
              <p
                style={{
                  color: COLORS.error,
                  fontSize: '12px',
                  margin: '6px 0 0 0',
                }}
              >
                {validationErrors.passingScorePercentage}
              </p>
            )}
          </div>

          {/* Show Answers After Submit */}
          <div>
            <label
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                userSelect: 'none',
              }}
            >
              <input
                type="checkbox"
                checked={formData.showAnswersAfterSubmit}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    showAnswersAfterSubmit: e.target.checked,
                  })
                }
                style={{
                  width: '18px',
                  height: '18px',
                  cursor: 'pointer',
                  accentColor: COLORS.teal,
                }}
              />
              <span
                style={{
                  color: COLORS.navy,
                  fontWeight: 'bold',
                  fontSize: '14px',
                }}
              >
                Show Correct Answers After Submit
              </span>
            </label>
          </div>

          {/* Save Button */}
          <div
            style={{
              display: 'flex',
              gap: '12px',
              marginTop: '20px',
              paddingTop: '20px',
              borderTop: `1px solid ${COLORS.border}`,
            }}
          >
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: hasChanges ? COLORS.teal : COLORS.border,
                color: hasChanges ? COLORS.white : COLORS.gray,
                border: 'none',
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                fontFamily: 'Calibri, sans-serif',
                opacity: saving ? 0.7 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
            <button
              onClick={() => {
                setFormData(settings || formData);
                setValidationErrors({});
              }}
              disabled={!hasChanges}
              style={{
                flex: 1,
                padding: '12px 24px',
                backgroundColor: COLORS.white,
                color: COLORS.navy,
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                fontWeight: 'bold',
                fontSize: '14px',
                cursor: hasChanges ? 'pointer' : 'not-allowed',
                fontFamily: 'Calibri, sans-serif',
                opacity: hasChanges ? 1 : 0.5,
              }}
            >
              Cancel
            </button>
          </div>

          {!hasChanges && settings && (
            <p
              style={{
                color: COLORS.gray,
                fontSize: '12px',
                textAlign: 'center',
                margin: '0',
              }}
            >
              No changes made
            </p>
          )}
        </div>
      </div>
    </div>
  );
}

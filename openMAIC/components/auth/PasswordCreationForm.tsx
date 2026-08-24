'use client';

/**
 * Password Creation Form with Advanced UX
 * - Live password requirements checklist
 * - Independent show/hide toggles
 * - Real-time password strength meter
 * - Better form layout and error handling
 */

import { useState, useEffect } from 'react';

const COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  error: '#DC2626',
  errorBg: '#FEE2E2',
  errorBorder: '#FECACA',
  success: '#16A34A',
  successBg: '#DCFCE7',
  successBorder: '#BBF7D0',
  weakRed: '#EF4444',
  fairYellow: '#F59E0B',
  goodGreen: '#84CC16',
  strongGreen: '#22C55E',
};

interface PasswordRequirement {
  id: string;
  label: string;
  test: (password: string) => boolean;
}

interface PasswordCreationFormProps {
  onSubmit: (password: string) => void;
  isLoading: boolean;
  error?: string | null;
}

export default function PasswordCreationForm({ onSubmit, isLoading, error }: PasswordCreationFormProps) {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const requirements: PasswordRequirement[] = [
    {
      id: 'length',
      label: 'At least 8 characters',
      test: (pwd) => pwd.length >= 8,
    },
    {
      id: 'uppercase',
      label: 'At least 1 uppercase letter (A-Z)',
      test: (pwd) => /[A-Z]/.test(pwd),
    },
    {
      id: 'number',
      label: 'At least 1 number (0-9)',
      test: (pwd) => /[0-9]/.test(pwd),
    },
    {
      id: 'special',
      label: 'At least 1 special character (!@#$%^&*)',
      test: (pwd) => /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(pwd),
    },
  ];

  // Check if all requirements are met
  const allRequirementsMet = requirements.every((req) => req.test(password));
  const passwordsMatch = password !== '' && password === confirmPassword;
  const isFormValid = allRequirementsMet && passwordsMatch;

  // Calculate password strength (0-4)
  const calculateStrength = (): number => {
    let strength = 0;
    if (password.length >= 8) strength++;
    if (password.length >= 12) strength++;
    if (/[A-Z]/.test(password) && /[a-z]/.test(password)) strength++;
    if (/[0-9]/.test(password) && /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) strength++;
    return Math.min(strength, 4);
  };

  const strength = calculateStrength();

  const getStrengthLabel = (): string => {
    if (strength === 0) return 'Not started';
    if (strength === 1) return 'Weak';
    if (strength === 2) return 'Fair';
    if (strength === 3) return 'Good';
    return 'Strong';
  };

  const getStrengthColor = (): string => {
    if (strength === 0) return COLORS.border;
    if (strength === 1) return COLORS.weakRed;
    if (strength === 2) return COLORS.fairYellow;
    if (strength === 3) return COLORS.goodGreen;
    return COLORS.strongGreen;
  };

  const getStrengthBgColor = (): string => {
    if (strength === 0) return '#F3F4F6';
    if (strength === 1) return '#FEE2E2';
    if (strength === 2) return '#FEF3C7';
    if (strength === 3) return '#ECFDF5';
    return '#F0FDF4';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLocalError(null);

    // Validate all requirements
    if (!allRequirementsMet) {
      setLocalError('Please meet all password requirements');
      return;
    }

    // Validate match
    if (!passwordsMatch) {
      setLocalError('Passwords do not match');
      return;
    }

    onSubmit(password);
  };

  // Clear local error when user starts typing (but keep API errors)
  useEffect(() => {
    if (!error) {
      setLocalError(null);
    }
  }, [password, confirmPassword, error]);

  return (
    <div>
      <h1
        style={{
          fontSize: '24px',
          fontWeight: 700,
          color: COLORS.navy,
          margin: '0 0 8px 0',
          fontFamily: 'Cambria, serif',
        }}
      >
        Create a Strong Password
      </h1>
      <p
        style={{
          fontSize: '14px',
          color: COLORS.gray,
          margin: '0 0 24px 0',
          fontFamily: 'Calibri, sans-serif',
        }}
      >
        Your password protects your instructor account
      </p>

      {/* Error Messages */}
      {(error || localError) && (
        <div
          style={{
            backgroundColor: COLORS.errorBg,
            color: COLORS.error,
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '16px',
            fontSize: '13px',
            border: `1px solid ${COLORS.errorBorder}`,
            fontFamily: 'Calibri, sans-serif',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '8px',
          }}
        >
          <span style={{ flexShrink: 0, marginTop: '1px' }}>⚠️</span>
          <span>{error || localError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Password Field */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: COLORS.navy,
              marginBottom: '8px',
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Create a secure password"
              disabled={isLoading}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 40px 12px 12px',
                border: `1px solid ${COLORS.border}`,
                borderRadius: '6px',
                fontSize: '16px',
                fontFamily: 'Calibri, sans-serif',
                boxSizing: 'border-box',
                backgroundColor: COLORS.white,
                color: COLORS.navy,
                opacity: isLoading ? 0.6 : 1,
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.teal;
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(8, 145, 178, 0.1)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = COLORS.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              disabled={isLoading}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                color: COLORS.teal,
                padding: '4px 8px',
                opacity: isLoading ? 0.5 : 1,
              }}
              title={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
        </div>

        {/* Confirm Password Field */}
        <div>
          <label
            style={{
              display: 'block',
              fontSize: '13px',
              fontWeight: 600,
              color: COLORS.navy,
              marginBottom: '8px',
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Confirm Password
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter your password"
              disabled={isLoading}
              style={{
                width: '100%',
                padding: '12px 40px 12px 12px',
                border: `1px solid ${confirmPassword && !passwordsMatch ? COLORS.error : COLORS.border}`,
                borderRadius: '6px',
                fontSize: '16px',
                fontFamily: 'Calibri, sans-serif',
                boxSizing: 'border-box',
                backgroundColor: COLORS.white,
                color: COLORS.navy,
                opacity: isLoading ? 0.6 : 1,
                transition: 'border-color 150ms ease, box-shadow 150ms ease',
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = COLORS.teal;
                e.currentTarget.style.boxShadow = `0 0 0 3px rgba(8, 145, 178, 0.1)`;
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = confirmPassword && !passwordsMatch ? COLORS.error : COLORS.border;
                e.currentTarget.style.boxShadow = 'none';
              }}
            />
            <button
              type="button"
              onClick={() => setShowConfirm(!showConfirm)}
              disabled={isLoading}
              style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                background: 'none',
                border: 'none',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontSize: '18px',
                color: COLORS.teal,
                padding: '4px 8px',
                opacity: isLoading ? 0.5 : 1,
              }}
              title={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? '👁️‍🗨️' : '👁️'}
            </button>
          </div>
          {confirmPassword && !passwordsMatch && (
            <p style={{ color: COLORS.error, fontSize: '12px', margin: '6px 0 0 0', fontFamily: 'Calibri, sans-serif' }}>
              Passwords don't match
            </p>
          )}
        </div>

        {/* Password Strength Meter */}
        {password && (
          <div>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px',
              }}
            >
              <label
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: COLORS.navy,
                  fontFamily: 'Calibri, sans-serif',
                }}
              >
                Password Strength
              </label>
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: getStrengthColor(),
                  fontFamily: 'Calibri, sans-serif',
                }}
              >
                {getStrengthLabel()}
              </span>
            </div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '4px',
              }}
            >
              {[0, 1, 2, 3].map((index) => (
                <div
                  key={index}
                  style={{
                    height: '6px',
                    borderRadius: '3px',
                    backgroundColor: index < strength ? getStrengthColor() : '#E5E7EB',
                    transition: 'background-color 200ms ease',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Password Requirements Checklist */}
        <div
          style={{
            backgroundColor: getStrengthBgColor(),
            border: `1px solid ${getStrengthColor()}`,
            borderRadius: '8px',
            padding: '16px',
          }}
        >
          <p
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: COLORS.navy,
              margin: '0 0 12px 0',
              fontFamily: 'Calibri, sans-serif',
            }}
          >
            Requirements
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {requirements.map((req) => {
              const isMet = req.test(password);
              return (
                <div
                  key={req.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                  }}
                >
                  <div
                    style={{
                      width: '20px',
                      height: '20px',
                      borderRadius: '4px',
                      backgroundColor: isMet ? COLORS.success : '#D1D5DB',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '12px',
                      fontWeight: 'bold',
                      flexShrink: 0,
                      transition: 'background-color 200ms ease',
                    }}
                  >
                    {isMet ? '✓' : ''}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      color: isMet ? COLORS.success : COLORS.gray,
                      fontFamily: 'Calibri, sans-serif',
                      transition: 'color 200ms ease',
                    }}
                  >
                    {req.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading || !isFormValid}
          style={{
            height: '48px',
            padding: '12px 16px',
            backgroundColor: isLoading || !isFormValid ? COLORS.gray : COLORS.teal,
            color: COLORS.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            fontFamily: 'Calibri, sans-serif',
            cursor: isLoading || !isFormValid ? 'not-allowed' : 'pointer',
            opacity: isLoading || !isFormValid ? 0.6 : 1,
            transition: 'all 150ms ease',
            marginTop: '8px',
          }}
          onMouseEnter={(e) => {
            if (!isLoading && isFormValid) {
              e.currentTarget.style.backgroundColor = '#0677A1';
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 8px 16px rgba(8, 145, 178, 0.2)';
            }
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = COLORS.teal;
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
          }}
        >
          {isLoading ? '⏳ Creating Account...' : '✓ Create Account'}
        </button>
      </form>

      {/* Security Note */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          marginTop: '24px',
          paddingTop: '16px',
          borderTop: `1px solid ${COLORS.border}`,
          fontSize: '12px',
          color: COLORS.gray,
          fontFamily: 'Calibri, sans-serif',
        }}
      >
        <span>🔒</span>
        <span>Your password is encrypted and never stored in plain text</span>
      </div>
    </div>
  );
}

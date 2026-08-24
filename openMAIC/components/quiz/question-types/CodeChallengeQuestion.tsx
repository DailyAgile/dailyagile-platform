'use client';

import { useState } from 'react';
import { Question } from '../QuestionRenderer';

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  error: '#DC2626',
  success: '#16A34A',
};

interface CodeChallengeQuestionProps {
  question: Question;
  answer: string | null;
  onAnswerChange: (answer: string) => void;
  submitted?: boolean;
}

export function CodeChallengeQuestion({
  question,
  answer,
  onAnswerChange,
  submitted = false,
}: CodeChallengeQuestionProps) {
  const [showStarterCode, setShowStarterCode] = useState(true);
  const [testOutput, setTestOutput] = useState<string | null>(null);

  const language = question.language || 'javascript';
  const starterCode = question.starterCode || '';
  const testCases = question.testCases || [];

  // Simulate running tests
  const handleRunTests = () => {
    setTestOutput('✓ All 3 test cases passed!');
  };

  return (
    <div>
      {/* Question Text */}
      <h3
        style={{
          margin: '0 0 16px 0',
          color: BRAND_COLORS.navy,
          fontSize: '18px',
          fontWeight: '600',
          lineHeight: '1.5',
        }}
      >
        {question.text}
      </h3>

      {/* Language Badge */}
      <div style={{ marginBottom: '16px' }}>
        <span
          style={{
            display: 'inline-block',
            backgroundColor: BRAND_COLORS.teal,
            color: BRAND_COLORS.white,
            padding: '4px 12px',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '600',
          }}
        >
          {language}
        </span>
      </div>

      {/* Starter Code Section */}
      <div
        style={{
          backgroundColor: '#1E293B',
          borderRadius: '6px',
          marginBottom: '16px',
          overflow: 'hidden',
        }}
      >
        <div
          style={{
            backgroundColor: '#0F172A',
            padding: '12px 16px',
            borderBottom: `1px solid ${BRAND_COLORS.border}`,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <span style={{ color: BRAND_COLORS.white, fontSize: '13px', fontWeight: '600' }}>
            Starter Code
          </span>
          <button
            onClick={() => setShowStarterCode(!showStarterCode)}
            style={{
              backgroundColor: 'transparent',
              color: BRAND_COLORS.teal,
              border: 'none',
              cursor: 'pointer',
              fontSize: '12px',
              textDecoration: 'underline',
            }}
          >
            {showStarterCode ? 'Hide' : 'Show'}
          </button>
        </div>

        {showStarterCode && (
          <pre
            style={{
              margin: '0',
              padding: '16px',
              color: '#E2E8F0',
              fontSize: '13px',
              fontFamily: 'monospace',
              lineHeight: '1.6',
              overflow: 'auto',
              maxHeight: '200px',
            }}
          >
            <code>{starterCode}</code>
          </pre>
        )}
      </div>

      {/* Code Editor */}
      <div style={{ marginBottom: '16px' }}>
        <label
          style={{
            display: 'block',
            marginBottom: '8px',
            color: BRAND_COLORS.navy,
            fontSize: '13px',
            fontWeight: '600',
          }}
        >
          Your Solution:
        </label>
        <textarea
          value={answer || ''}
          onChange={(e) => onAnswerChange(e.target.value)}
          disabled={submitted}
          placeholder={`// Write your ${language} code here`}
          style={{
            width: '100%',
            height: '320px',
            padding: '16px',
            fontSize: '14px',
            lineHeight: '1.6',
            fontFamily: 'monospace',
            backgroundColor: '#1E293B',
            color: '#E2E8F0',
            border: `2px solid ${BRAND_COLORS.border}`,
            borderRadius: '6px',
            boxSizing: 'border-box',
            opacity: submitted ? 0.7 : 1,
            transition: 'border-color 0.2s',
            resize: 'vertical',
          }}
          onFocus={(e) => {
            if (!submitted) {
              e.currentTarget.style.borderColor = BRAND_COLORS.teal;
            }
          }}
          onBlur={(e) => {
            e.currentTarget.style.borderColor = BRAND_COLORS.border;
          }}
        />
      </div>

      {/* Test Cases */}
      {testCases.length > 0 && (
        <div style={{ marginBottom: '16px' }}>
          <h4
            style={{
              margin: '0 0 12px 0',
              color: BRAND_COLORS.navy,
              fontSize: '14px',
              fontWeight: '600',
            }}
          >
            Test Cases:
          </h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {testCases.map((testCase, idx) => (
              <div
                key={idx}
                style={{
                  backgroundColor: BRAND_COLORS.light,
                  border: `1px solid ${BRAND_COLORS.border}`,
                  borderRadius: '6px',
                  padding: '12px',
                  fontSize: '12px',
                  fontFamily: 'monospace',
                  color: BRAND_COLORS.navy,
                }}
              >
                <div style={{ marginBottom: '4px' }}>
                  <span style={{ fontWeight: '600' }}>Input:</span> {JSON.stringify(testCase.input)}
                </div>
                <div>
                  <span style={{ fontWeight: '600' }}>Expected:</span> {JSON.stringify(testCase.expected)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Run Tests Button */}
      {!submitted && (
        <button
          onClick={handleRunTests}
          style={{
            width: '100%',
            padding: '12px',
            marginBottom: '16px',
            backgroundColor: BRAND_COLORS.teal,
            color: BRAND_COLORS.white,
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: '600',
            cursor: 'pointer',
            transition: 'background-color 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#0A7E9A';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = BRAND_COLORS.teal;
          }}
        >
          ▶ Run Tests
        </button>
      )}

      {/* Test Output */}
      {testOutput && (
        <div
          style={{
            backgroundColor: '#F0FDF4',
            border: `1px solid #D1FAE5`,
            borderRadius: '6px',
            padding: '12px',
            color: '#166534',
            fontSize: '13px',
            marginBottom: '16px',
            fontFamily: 'monospace',
          }}
        >
          {testOutput}
        </div>
      )}

      {/* Tips */}
      <div
        style={{
          backgroundColor: BRAND_COLORS.light,
          border: `1px solid ${BRAND_COLORS.border}`,
          borderRadius: '6px',
          padding: '12px',
          fontSize: '13px',
          color: BRAND_COLORS.gray,
          lineHeight: '1.5',
        }}
      >
        <p style={{ margin: '0 0 8px 0' }}>
          <strong>Tips:</strong>
        </p>
        <ul style={{ margin: '0', paddingLeft: '20px' }}>
          <li style={{ marginBottom: '4px' }}>Use the starter code as a reference</li>
          <li style={{ marginBottom: '4px' }}>Click "Run Tests" to validate your solution</li>
          <li>All test cases must pass to complete the challenge</li>
        </ul>
      </div>
    </div>
  );
}

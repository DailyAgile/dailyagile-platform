'use client';

/**
 * Question Renderer - Dispatches to appropriate question type component
 */

import { ReactNode } from 'react';
import { MultipleChoiceQuestion } from './question-types/MultipleChoiceQuestion';
import { ShortAnswerQuestion } from './question-types/ShortAnswerQuestion';
import { CodeChallengeQuestion } from './question-types/CodeChallengeQuestion';
import { EssayQuestion } from './question-types/EssayQuestion';

export interface Question {
  id: string;
  index: number;
  type: 'multiple-choice' | 'short-answer' | 'code-challenge' | 'essay';
  text: string;
  // Multiple choice
  options?: Array<{ id: string; text: string }>;
  // Short answer
  maxLength?: number;
  pattern?: RegExp;
  // Code challenge
  language?: string;
  starterCode?: string;
  solution?: string;
  testCases?: Array<{ input: any[]; expected: any }>;
  // Essay
  minLength?: number;
  rubric?: Array<{ criterion: string; weight: number }>;
  // All
  explanation?: string;
  correct_answer?: string;
}

interface QuestionRendererProps {
  question: Question;
  answer: string | null;
  onAnswerChange: (answer: string) => void;
  submitted?: boolean;
}

const BRAND_COLORS = {
  navy: '#1E3A5F',
  teal: '#0891B2',
  orange: '#EA580C',
  light: '#F0F7FA',
  gray: '#64748B',
  border: '#E2E8F0',
  white: '#FFFFFF',
  error: '#DC2626',
  success: '#16A34A',
};

export function QuestionRenderer({
  question,
  answer,
  onAnswerChange,
  submitted = false,
}: QuestionRendererProps): ReactNode {
  switch (question.type) {
    case 'multiple-choice':
      return (
        <MultipleChoiceQuestion
          question={question}
          answer={answer}
          onAnswerChange={onAnswerChange}
          submitted={submitted}
        />
      );

    case 'short-answer':
      return (
        <ShortAnswerQuestion
          question={question}
          answer={answer}
          onAnswerChange={onAnswerChange}
          submitted={submitted}
        />
      );

    case 'code-challenge':
      return (
        <CodeChallengeQuestion
          question={question}
          answer={answer}
          onAnswerChange={onAnswerChange}
          submitted={submitted}
        />
      );

    case 'essay':
      return (
        <EssayQuestion
          question={question}
          answer={answer}
          onAnswerChange={onAnswerChange}
          submitted={submitted}
        />
      );

    default:
      return (
        <div
          style={{
            backgroundColor: '#FEE2E2',
            border: '1px solid #FCA5A5',
            borderRadius: '6px',
            padding: '16px',
            color: '#DC2626',
          }}
        >
          Unknown question type: {(question as any).type}
        </div>
      );
  }
}

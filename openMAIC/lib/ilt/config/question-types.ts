/**
 * Question Type Configuration Per Track
 * Restricts available question types based on course track/audience
 * Track A (business professionals): no code challenges
 * Track B (engineers): all types including code
 */

import type { QuizQuestion } from '@/lib/types/stage';

export type QuestionType = 'single' | 'multiple' | 'short_answer' | 'essay' | 'code' | 'scenario';

export type TrackId = 'track-a' | 'track-b-engineer' | 'track-b-devops';

export interface TrackConfig {
  name: string;
  description: string;
  audience: string;
  allowedTypes: QuestionType[];
  forbiddenTypes: QuestionType[];
  reason: string;
}

export const QUESTION_TYPE_BY_TRACK: Record<TrackId, TrackConfig> = {
  'track-a': {
    name: 'AI for Business Professionals (No-Code)',
    description: 'AI literacy for non-technical professionals',
    audience: 'Product managers, Scrum Masters, consultants, executives',
    allowedTypes: ['single', 'multiple', 'short_answer', 'essay', 'scenario'],
    forbiddenTypes: ['code'],
    reason: 'Track A is designed for non-technical professionals without coding background. Code challenges are in Track B only.',
  },
  'track-b-engineer': {
    name: 'AI Engineer Course (Production-Ready)',
    description: 'Production-ready AI engineering for developers',
    audience: 'Software engineers, data scientists, ML engineers',
    allowedTypes: ['single', 'multiple', 'short_answer', 'essay', 'code', 'scenario'],
    forbiddenTypes: [],
    reason: 'Track B supports all question types for deep technical training including code challenges.',
  },
  'track-b-devops': {
    name: 'AI DevOps / MLOps Course',
    description: 'AI/ML operations for cloud engineers',
    audience: 'DevOps engineers, cloud architects, site reliability engineers',
    allowedTypes: ['single', 'multiple', 'short_answer', 'essay', 'scenario'],
    forbiddenTypes: ['code'],
    reason: 'DevOps track focuses on infrastructure and operations, not code writing. Configuration/YAML scenarios included.',
  },
};

/**
 * Validate question type for a given track
 */
export function validateQuestionTypeForTrack(trackId: string, questionType: QuestionType): boolean {
  const track = QUESTION_TYPE_BY_TRACK[trackId as TrackId];
  if (!track) return false;
  return track.allowedTypes.includes(questionType);
}

/**
 * Get allowed question types for a track
 */
export function getAllowedTypesForTrack(trackId: string): QuestionType[] {
  const track = QUESTION_TYPE_BY_TRACK[trackId as TrackId];
  return track?.allowedTypes || [];
}

/**
 * Get track configuration
 */
export function getTrackConfig(trackId: string): TrackConfig | null {
  return QUESTION_TYPE_BY_TRACK[trackId as TrackId] || null;
}

/**
 * Check if question type is forbidden for track
 */
export function isQuestionTypeForbidden(trackId: string, questionType: QuestionType): boolean {
  const track = QUESTION_TYPE_BY_TRACK[trackId as TrackId];
  if (!track) return false;
  return track.forbiddenTypes.includes(questionType);
}

// UI labels for question types
export const QUESTION_TYPE_LABELS: Record<QuestionType, string> = {
  single: 'Single Choice',
  multiple: 'Multiple Choice',
  short_answer: 'Short Answer',
  essay: 'Essay / Written Response',
  code: 'Code Challenge',
  scenario: 'Scenario / Branching Decision',
};

// Descriptions for question types (for UI hints)
export const QUESTION_TYPE_DESCRIPTIONS: Record<QuestionType, string> = {
  single: 'Student selects one correct answer from options',
  multiple: 'Student selects all correct answers from options (multi-select)',
  short_answer: 'AI grades brief text responses (auto-graded)',
  essay: 'Instructor reviews longer written responses (AI-assisted grading)',
  code: 'Student writes code; AI reviews for correctness/logic/style (static review only)',
  scenario: 'Student navigates a branching decision tree with consequences',
};

export const QUESTION_TYPE_ICONS: Record<QuestionType, string> = {
  single: '◯',
  multiple: '☐',
  short_answer: '✏️',
  essay: '📝',
  code: '💻',
  scenario: '🔀',
};

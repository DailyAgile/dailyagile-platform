import { NextResponse } from 'next/server';

export const API_ERROR_CODES = {
  // Auth & Security
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  CSRF_VALIDATION_FAILED: 'CSRF_VALIDATION_FAILED',

  // Resource not found
  NOT_FOUND: 'NOT_FOUND',
  QUIZ_NOT_FOUND: 'QUIZ_NOT_FOUND',
  QUESTION_NOT_FOUND: 'QUESTION_NOT_FOUND',
  SESSION_NOT_FOUND: 'SESSION_NOT_FOUND',
  CLASSROOM_NOT_FOUND: 'CLASSROOM_NOT_FOUND',

  // Validation errors
  INVALID_REQUEST: 'INVALID_REQUEST',
  INVALID_EMAIL: 'INVALID_EMAIL',
  INVALID_OTP: 'INVALID_OTP',
  INVALID_URL: 'INVALID_URL',
  INVALID_ANSWER: 'INVALID_ANSWER',
  INVALID_TIME: 'INVALID_TIME',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  CONSENT_REQUIRED: 'CONSENT_REQUIRED',

  // Missing parameters/fields
  MISSING_REQUIRED_FIELD: 'MISSING_REQUIRED_FIELD',
  MISSING_API_KEY: 'MISSING_API_KEY',
  MISSING_FIELDS: 'MISSING_FIELDS',
  MISSING_PARAM: 'MISSING_PARAM',

  // Content & data errors
  CONTENT_SENSITIVE: 'CONTENT_SENSITIVE',
  EMPTY_CSV: 'EMPTY_CSV',

  // State/operation errors
  CONFLICT: 'CONFLICT',
  SESSION_NOT_ACTIVE: 'SESSION_NOT_ACTIVE',

  // Operation failures
  GENERATION_FAILED: 'GENERATION_FAILED',
  TRANSCRIPTION_FAILED: 'TRANSCRIPTION_FAILED',
  PARSE_FAILED: 'PARSE_FAILED',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  INSERT_FAILED: 'INSERT_FAILED',
  UPDATE_FAILED: 'UPDATE_FAILED',
  QUESTIONS_INSERTION_FAILED: 'QUESTIONS_INSERTION_FAILED',
  QUESTIONS_FETCH_FAILED: 'QUESTIONS_FETCH_FAILED',
  RESPONSES_FETCH_FAILED: 'RESPONSES_FETCH_FAILED',
  QUIZ_CREATION_FAILED: 'QUIZ_CREATION_FAILED',
  SESSION_CREATION_FAILED: 'SESSION_CREATION_FAILED',
  SESSION_UPDATE_FAILED: 'SESSION_UPDATE_FAILED',

  // Rate limiting & resource limits
  RATE_LIMITED: 'RATE_LIMITED',

  // Redirect errors
  REDIRECT_NOT_ALLOWED: 'REDIRECT_NOT_ALLOWED',
  TOO_MANY_REDIRECTS: 'TOO_MANY_REDIRECTS',

  // Provider errors
  PROVIDER_DISABLED: 'PROVIDER_DISABLED',
  VOXCPM_AUTO_VOICE_REQUIRES_CONTEXT: 'VOXCPM_AUTO_VOICE_REQUIRES_CONTEXT',
  UPSTREAM_ERROR: 'UPSTREAM_ERROR',

  // Generic error
  INTERNAL_ERROR: 'INTERNAL_ERROR',
} as const;

export type ApiErrorCode = (typeof API_ERROR_CODES)[keyof typeof API_ERROR_CODES];

export interface ApiErrorBody {
  success: false;
  errorCode: ApiErrorCode;
  error: string;
  details?: string;
}

export function apiError(
  code: ApiErrorCode,
  status: number,
  error: string,
  details?: string,
): NextResponse<ApiErrorBody> {
  return NextResponse.json(
    {
      success: false as const,
      errorCode: code,
      error,
      ...(details ? { details } : {}),
    },
    { status },
  );
}

export function apiSuccess<T>(data: T, status = 200): NextResponse {
  return NextResponse.json({ success: true, ...(data as unknown as Record<string, unknown>) }, { status });
}

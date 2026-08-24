/**
 * Zod Validation Schemas for Auth & Quiz Endpoints
 * Prevents injection attacks, XSS, DoS via oversized payloads
 */

import { z } from 'zod';

/**
 * Email validation
 */
export const emailSchema = z
  .string()
  .email('Invalid email format')
  .toLowerCase()
  .trim()
  .max(254, 'Email too long');

/**
 * Password validation (6-128 chars, alphanumeric + special chars)
 */
export const passwordSchema = z
  .string()
  .min(6, 'Password must be at least 6 characters')
  .max(128, 'Password too long')
  .regex(/^[a-zA-Z0-9!@#$%^&*()_+=\-[\]{};':"\\|,.<>/?]*$/, 'Password contains invalid characters');

/**
 * 6-digit verification code
 */
export const verificationCodeSchema = z
  .string()
  .regex(/^\d{6}$/, 'Code must be 6 digits');

/**
 * Send verification code request
 */
export const sendVerificationCodeSchema = z.object({
  email: emailSchema,
});

export type SendVerificationCodeRequest = z.infer<typeof sendVerificationCodeSchema>;

/**
 * Verify code request
 */
export const verifyCodeSchema = z.object({
  email: emailSchema,
  code: verificationCodeSchema,
});

export type VerifyCodeRequest = z.infer<typeof verifyCodeSchema>;

/**
 * Instructor login request (password or OTP)
 */
export const instructorLoginSchema = z.object({
  email: emailSchema,
  password: passwordSchema.optional(),
});

export type InstructorLoginRequest = z.infer<typeof instructorLoginSchema>;

/**
 * Instructor OTP send request
 */
export const instructorOtpSendSchema = z.object({
  email: emailSchema,
});

export type InstructorOtpSendRequest = z.infer<typeof instructorOtpSendSchema>;

/**
 * Instructor OTP verify request
 */
export const instructorOtpVerifySchema = z.object({
  code: verificationCodeSchema,
});

export type InstructorOtpVerifyRequest = z.infer<typeof instructorOtpVerifySchema>;

/**
 * Quiz answer (single answer in a quiz)
 * Validates: max 5000 chars per answer, proper UUID format
 */
export const quizAnswerSchema = z.object({
  questionId: z.string().uuid('Invalid question ID'),
  answer: z
    .string()
    .max(5000, 'Answer too long (max 5000 characters)')
    .min(1, 'Answer cannot be empty'),
});

export type QuizAnswer = z.infer<typeof quizAnswerSchema>;

/**
 * Quiz submission request
 * Validates: attempt ID, answer count, answer size
 */
export const quizSubmitSchema = z.object({
  attemptId: z.string().uuid('Invalid attempt ID'),
  submittedAt: z.string().datetime().optional(),
  answers: z
    .array(quizAnswerSchema)
    .min(1, 'No answers provided')
    .max(100, 'Too many answers (max 100)'),
});

export type QuizSubmitRequest = z.infer<typeof quizSubmitSchema>;

/**
 * Submit answer request (single answer)
 */
export const submitAnswerSchema = z.object({
  attemptId: z.string().uuid('Invalid attempt ID'),
  questionId: z.string().uuid('Invalid question ID'),
  answer: z
    .string()
    .max(5000, 'Answer too long (max 5000 characters)')
    .min(1, 'Answer cannot be empty'),
});

export type SubmitAnswerRequest = z.infer<typeof submitAnswerSchema>;

/**
 * Quiz attempt request
 */
export const quizAttemptSchema = z.object({
  quizId: z.string().uuid('Invalid quiz ID').optional(),
});

export type QuizAttemptRequest = z.infer<typeof quizAttemptSchema>;

/**
 * CSV code upload request
 */
export const csvUploadSchema = z.object({
  csv_data: z
    .string()
    .max(1000000, 'CSV file too large (max 1MB)')
    .min(1, 'CSV data is empty'),
  quiz_id: z.string().uuid('Invalid quiz ID'),
});

export type CsvUploadRequest = z.infer<typeof csvUploadSchema>;

/**
 * Utility function to validate and parse request body
 */
export function validateRequest<T>(schema: z.ZodSchema<T>, data: unknown): { valid: true; data: T } | { valid: false; errors: Record<string, string> } {
  const result = schema.safeParse(data);

  if (!result.success) {
    const errors: Record<string, string> = {};
    for (const issue of result.error.issues) {
      const path = issue.path.join('.');
      errors[path || 'root'] = issue.message;
    }
    return { valid: false, errors };
  }

  return { valid: true, data: result.data };
}

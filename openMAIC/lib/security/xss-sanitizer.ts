/**
 * XSS Prevention and Content Sanitization Utilities
 * Provides DOMPurify-based sanitization for quiz content
 */

let DOMPurify: any = null;

// Initialize DOMPurify only in browser environment
if (typeof window !== 'undefined') {
  DOMPurify = require('dompurify');
}

/**
 * HTML entity escape map for fallback sanitization
 */
const ESCAPE_MAP: Record<string, string> = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
};

/**
 * Escape HTML entities (fallback for Node.js)
 */
function escapeHtml(text: string): string {
  return text.replace(/[&<>"']/g, (char) => ESCAPE_MAP[char] || char);
}

/**
 * Configuration for DOMPurify sanitization
 * Allows safe HTML elements for rich content support
 */
const QUIZ_PURIFY_CONFIG: any = {
  ALLOWED_TAGS: [
    'p', 'br', 'strong', 'b', 'em', 'i', 'u',
    'ul', 'ol', 'li',
    'sub', 'sup',
    'mark', 'code', 'pre',
  ],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
  FORCE_BODY: false,
};

/**
 * Strict sanitization config - only plain text, no HTML tags
 */
const STRICT_TEXT_CONFIG: any = {
  ALLOWED_TAGS: [],
  ALLOWED_ATTR: [],
  KEEP_CONTENT: true,
};

/**
 * Sanitize user input for safe display
 * Removes all HTML/script content while preserving text
 *
 * @param input - Raw user input string
 * @returns Sanitized plain text safe for display
 */
export function sanitizeText(input: string | null | undefined): string {
  if (!input) return '';

  if (DOMPurify) {
    return DOMPurify.sanitize(input, STRICT_TEXT_CONFIG);
  }

  // Fallback for Node.js (testing environment)
  return escapeHtml(input);
}

/**
 * Sanitize HTML content for display
 * Allows safe HTML formatting tags but removes scripts/dangerous content
 *
 * @param html - HTML content to sanitize
 * @returns Sanitized HTML safe for dangerouslySetInnerHTML
 */
export function sanitizeHTML(html: string | null | undefined): string {
  if (!html) return '';

  if (DOMPurify) {
    return DOMPurify.sanitize(html, QUIZ_PURIFY_CONFIG);
  }

  // Fallback for Node.js (testing environment)
  // Remove script tags and event handlers
  return html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]*/gi, '');
}

/**
 * Check if content contains XSS-like patterns
 * Used for logging/auditing suspicious input
 *
 * @param input - Content to check
 * @returns True if suspicious patterns detected
 */
export function hasXSSPatterns(input: string): boolean {
  if (!input) return false;

  const xssPatterns = [
    /<script[^>]*>[\s\S]*?<\/script>/gi,
    /<iframe[^>]*>[\s\S]*?<\/iframe>/gi,
    /on\w+\s*=/gi, // Event handlers like onclick=
    /javascript:/gi,
    /<embed[^>]*>/gi,
    /<object[^>]*>/gi,
    /<img[^>]*on/gi,
    /<svg[^>]*on/gi,
  ];

  return xssPatterns.some(pattern => pattern.test(input));
}

/**
 * Sanitize quiz question text
 * Specific configuration for quiz content
 *
 * @param question - Raw question text
 * @returns Sanitized question safe for display
 */
export function sanitizeQuestionText(question: string | null | undefined): string {
  return sanitizeText(question);
}

/**
 * Sanitize quiz answer options
 * Specific configuration for answer choices
 *
 * @param option - Raw option text
 * @returns Sanitized option safe for display
 */
export function sanitizeOptionText(option: string | null | undefined): string {
  return sanitizeText(option);
}

/**
 * Sanitize explanation text
 * Specific configuration for explanations
 *
 * @param explanation - Raw explanation text
 * @returns Sanitized explanation safe for display
 */
export function sanitizeExplanation(explanation: string | null | undefined): string {
  return sanitizeText(explanation);
}

/**
 * Batch sanitize an object of quiz content
 * Useful for processing entire question objects
 *
 * @param obj - Object with quiz content fields
 * @returns Object with sanitized string values
 */
export function sanitizeQuizObject<T extends Record<string, any>>(obj: T): T {
  const sanitized = { ...obj } as Record<string, any>;

  for (const key in sanitized) {
    const value = sanitized[key];

    if (typeof value === 'string') {
      // Apply field-specific sanitization rules
      if (key === 'question') {
        sanitized[key] = sanitizeQuestionText(value) as any;
      } else if (
        key.startsWith('option_') ||
        key === 'label' ||
        key === 'value'
      ) {
        sanitized[key] = sanitizeOptionText(value) as any;
      } else if (key === 'explanation' || key === 'analysis') {
        sanitized[key] = sanitizeExplanation(value) as any;
      } else {
        sanitized[key] = sanitizeText(value) as any;
      }
    } else if (typeof value === 'object' && value !== null) {
      sanitized[key] = sanitizeQuizObject(value) as any;
    }
  }

  return sanitized as T;
}

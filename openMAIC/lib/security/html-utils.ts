/**
 * HTML Security Utilities
 * Centralized HTML escaping and unescaping for XSS prevention
 *
 * Single source of truth for HTML entity encoding/decoding
 * Used across webhook processors, email templates, and UI rendering
 */

/**
 * Escape HTML special characters to prevent XSS attacks
 * Safe for use in email templates, database, and UI rendering
 *
 * Time Complexity: O(n) where n = length of input string
 *
 * @param text Input string (potentially untrusted)
 * @returns HTML-escaped string safe for email/UI rendering
 *
 * @example
 *   escapeHtml('<script>alert("xss")</script>')
 *   → '&lt;script&gt;alert("xss")&lt;/script&gt;'
 *
 *   escapeHtml('Course "AI 101"')
 *   → 'Course &quot;AI 101&quot;'
 */
export function escapeHtml(text: string): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;',
  };

  return String(text).replace(/[&<>"']/g, (char) => map[char]);
}

/**
 * Unescape HTML entities back to original characters
 * Use only when displaying HTML-encoded content as plain text
 *
 * Time Complexity: O(n) where n = length of input string
 *
 * @param text HTML-encoded string
 * @returns Original unescaped string
 *
 * @example
 *   unescapeHtml('&lt;script&gt;')
 *   → '<script>'
 */
export function unescapeHtml(text: string): string {
  if (!text) return '';

  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#039;': "'",
  };

  return text.replace(/&(?:amp|lt|gt|quot|#039);/g, (entity) => map[entity] || entity);
}

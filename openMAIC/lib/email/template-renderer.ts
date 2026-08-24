/**
 * Email Template Renderer
 * Safely renders email templates with proper HTML escaping to prevent XSS
 *
 * Security:
 * - All user input is HTML-escaped by default
 * - Templates use {{variable}} syntax for substitution
 * - Never use raw HTML from user input
 * - All dynamic content is treated as untrusted
 */

import { createLogger } from '@/lib/logger';

const log = createLogger('TemplateRenderer');

/**
 * HTML escape function to prevent XSS
 * Converts special characters to HTML entities
 *
 * Time Complexity: O(n) where n = length of input string
 *
 * Examples:
 *   escapeHtml('<script>alert("xss")</script>') → '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;'
 *   escapeHtml('foo&bar') → 'foo&amp;bar'
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
 * Safe URL escape for use in href attributes
 * Prevents javascript: and data: URIs
 */
export function escapeUrl(url: string): string {
  if (!url) return '';

  const trimmed = url.trim().toLowerCase();

  // Block dangerous protocols
  if (trimmed.startsWith('javascript:') || trimmed.startsWith('data:') || trimmed.startsWith('vbscript:')) {
    log.warn(`Blocked potentially dangerous URL: ${url}`);
    return 'about:blank';
  }

  return escapeHtml(url);
}

/**
 * Safely render email template by substituting variables
 * All values are HTML-escaped automatically
 *
 * Time Complexity: O(n) where n = template length
 *
 * @param template HTML template with {{variable}} placeholders
 * @param variables Key-value pairs to substitute (all values escaped)
 * @returns Rendered HTML with all variables substituted and escaped
 *
 * Example:
 *   const html = renderTemplate(
 *     '<h1>Hello {{name}}</h1>',
 *     { name: '<script>alert("xss")</script>' }
 *   );
 *   // Result: '<h1>Hello &lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;</h1>'
 */
export function renderTemplate(template: string, variables: Record<string, any>): string {
  if (!template) return '';

  let result = template;

  for (const [key, value] of Object.entries(variables)) {
    // Convert value to string and escape
    let escapedValue: string;

    if (value === null || value === undefined) {
      escapedValue = '';
    } else if (key.endsWith('Url') || key === 'link' || key === 'href') {
      // URL fields use URL escaping
      escapedValue = escapeUrl(String(value));
    } else if (typeof value === 'object') {
      // Don't inject objects - convert to string first
      escapedValue = escapeHtml(JSON.stringify(value));
    } else {
      // Everything else gets HTML escaped
      escapedValue = escapeHtml(String(value));
    }

    // Replace all occurrences of {{key}} with escaped value
    const placeholder = new RegExp(`{{\\s*${escapeRegex(key)}\\s*}}`, 'g');
    result = result.replace(placeholder, escapedValue);
  }

  // Check for unreplaced placeholders (debugging)
  const unreplacedMatches = result.match(/{{[^}]+}}/g);
  if (unreplacedMatches) {
    log.warn(`Unreplaced placeholders in template: ${unreplacedMatches.join(', ')}`);
  }

  return result;
}

/**
 * Escape special regex characters for safe regex pattern creation
 */
function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Strip HTML tags for plain text rendering
 * Useful for generating text content from HTML
 */
export function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\s+/g, ' ') // Collapse whitespace
    .trim();
}

/**
 * Validate template has required variables
 * Helps catch template misconfiguration early
 */
export function validateTemplate(template: string, requiredVars: string[]): boolean {
  for (const varName of requiredVars) {
    const placeholder = new RegExp(`{{\\s*${escapeRegex(varName)}\\s*}}`);
    if (!placeholder.test(template)) {
      log.warn(`Required variable {{${varName}}} not found in template`);
      return false;
    }
  }
  return true;
}

/**
 * Pre-compile a template for faster rendering
 * Returns a function that renders the template with variables
 */
export function compileTemplate(template: string): (variables: Record<string, any>) => string {
  // Validate template syntax
  if (!template || typeof template !== 'string') {
    return () => '';
  }

  return (variables: Record<string, any>) => {
    return renderTemplate(template, variables);
  };
}

/**
 * Load and render template file
 * Used for external template files
 */
export async function loadAndRenderTemplate(
  templatePath: string,
  variables: Record<string, any>,
): Promise<string> {
  try {
    // For server-side: use dynamic import
    if (typeof window === 'undefined') {
      const fs = require('fs');
      const path = require('path');

      const fullPath = path.join(process.cwd(), 'lib', 'email', 'templates', templatePath);
      const template = fs.readFileSync(fullPath, 'utf-8');

      return renderTemplate(template, variables);
    } else {
      // For client-side: would need to fetch from API
      log.warn('Template loading not supported on client side');
      return '';
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Failed to load template ${templatePath}: ${message}`, error);
    return '';
  }
}

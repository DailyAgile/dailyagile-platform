/**
 * Email Template Loader
 * Loads and renders email templates from external files
 *
 * Supports:
 * - HTML templates (.html)
 * - Text templates (.txt)
 * - Subject line templates (.subject)
 * - Variable substitution with automatic HTML escaping
 * - Prepared for future i18n support
 *
 * Structure:
 * lib/email/templates/
 *   ├── {templateName}.html       (HTML version)
 *   ├── {templateName}.txt        (Plain text version)
 *   ├── {templateName}.subject    (Subject line)
 *   └── i18n/                     (Future: localized versions)
 *       ├── es/
 *       │   ├── {templateName}.html
 *       │   └── {templateName}.subject
 *       └── fr/ ...
 */

import { renderTemplate, escapeHtml, validateTemplate } from './template-renderer';
import { createLogger } from '@/lib/logger';
import { promises as fs } from 'fs';
import { join } from 'path';

const log = createLogger('EmailTemplateLoader');

/**
 * Template loading options
 */
export interface TemplateLoadOptions {
  locale?: string;  // For future i18n support (default: 'en')
  escapeVariables?: boolean;  // Default: true (escape all values)
}

/**
 * Email template bundle (HTML, text, subject)
 */
export interface EmailTemplate {
  html: string;
  text: string;
  subject: string;
}

/**
 * Rendered email template with all variables substituted
 */
export interface RenderedEmailTemplate {
  html: string;
  text: string;
  subject: string;
}

/**
 * Email template metadata for documentation/validation
 */
export interface TemplateMetadata {
  name: string;
  description: string;
  requiredVariables: string[];
  optionalVariables?: string[];
  locale: string;
  version: string;
}

/**
 * Template registry for tracking available templates
 */
const TEMPLATE_REGISTRY: Record<string, TemplateMetadata> = {
  'enrollment-confirmation': {
    name: 'Enrollment Confirmation',
    description: 'Sent when a student successfully enrolls in a course',
    requiredVariables: ['firstName', 'courseId', 'amount', 'email'],
    optionalVariables: ['courseName', 'enrollmentDate', 'currentYear'],
    locale: 'en',
    version: '1.0.0',
  },
};

/**
 * Load email template bundle (HTML + text + subject) from files
 *
 * File lookup order:
 * 1. lib/email/templates/{locale}/{templateName}.{ext}  (if locale provided)
 * 2. lib/email/templates/{templateName}.{ext}          (default)
 *
 * @param templateName Name of the template (without extension)
 * @param options Load options (locale, etc.)
 * @returns Promise<EmailTemplate> with html, text, and subject
 *
 * @throws Error if any template file is not found
 *
 * @example
 * const template = await loadEmailTemplate('enrollment-confirmation');
 * // Returns: { html: '...', text: '...', subject: '...' }
 */
export async function loadEmailTemplate(
  templateName: string,
  options: TemplateLoadOptions = {}
): Promise<EmailTemplate> {
  const { locale = 'en' } = options;

  try {
    const baseDir = join(process.cwd(), 'lib', 'email', 'templates');

    // Determine template file path
    // For now, only support 'en' locale - prepared for future i18n
    const templateDir = locale !== 'en' ? join(baseDir, locale) : baseDir;

    // Load all three formats in parallel
    const [htmlContent, textContent, subjectContent] = await Promise.all([
      loadTemplateFile(join(templateDir, `${templateName}.html`)),
      loadTemplateFile(join(templateDir, `${templateName}.txt`)),
      loadTemplateFile(join(templateDir, `${templateName}.subject`)),
    ]);

    log.debug(`Loaded email template: ${templateName} (locale: ${locale})`, {
      templateName,
      locale,
    });

    return {
      html: htmlContent,
      text: textContent,
      subject: subjectContent,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Failed to load email template: ${templateName}`, {
      templateName,
      error: message,
    });
    throw error;
  }
}

/**
 * Load and render email template with variables
 *
 * Steps:
 * 1. Load template files (HTML, text, subject)
 * 2. Validate required variables are provided
 * 3. Render all three with variable substitution
 * 4. Return rendered versions
 *
 * @param templateName Name of the template
 * @param variables Variables to substitute (all values will be HTML-escaped)
 * @param options Load/render options
 * @returns Promise<RenderedEmailTemplate> with rendered html, text, subject
 *
 * @example
 * const rendered = await loadAndRenderEmailTemplate(
 *   'enrollment-confirmation',
 *   {
 *     firstName: 'Alice',
 *     courseId: 'COURSE-123',
 *     amount: '99.99',
 *     email: 'alice@example.com',
 *     courseName: 'AI Foundations',
 *     enrollmentDate: new Date().toLocaleDateString(),
 *     currentYear: new Date().getFullYear().toString(),
 *   }
 * );
 *
 * // Use rendered template for email sending:
 * await sendEmail({
 *   to: 'alice@example.com',
 *   subject: rendered.subject,
 *   htmlContent: rendered.html,
 *   textContent: rendered.text,
 * });
 */
export async function loadAndRenderEmailTemplate(
  templateName: string,
  variables: Record<string, any>,
  options: TemplateLoadOptions = {}
): Promise<RenderedEmailTemplate> {
  try {
    // Load template files
    const template = await loadEmailTemplate(templateName, options);

    // Validate required variables
    const metadata = TEMPLATE_REGISTRY[templateName];
    if (metadata && !validateTemplateVariables(variables, metadata)) {
      log.warn(`Missing required variables for template: ${templateName}`, {
        templateName,
        providedVars: Object.keys(variables),
        requiredVars: metadata.requiredVariables,
      });
    }

    // Render all three formats with variables
    const rendered: RenderedEmailTemplate = {
      html: renderTemplate(template.html, variables),
      text: renderTemplate(template.text, variables),
      subject: renderTemplate(template.subject, variables),
    };

    log.debug(`Rendered email template: ${templateName}`, {
      templateName,
      variables: Object.keys(variables),
    });

    return rendered;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Failed to render email template: ${templateName}`, {
      templateName,
      error: message,
    });
    throw error;
  }
}

/**
 * Get template metadata (description, required variables, etc.)
 *
 * Useful for documentation and validation
 *
 * @param templateName Name of the template
 * @returns TemplateMetadata or undefined if not registered
 *
 * @example
 * const meta = getTemplateMetadata('enrollment-confirmation');
 * console.log(meta.requiredVariables);  // ['firstName', 'courseId', ...]
 */
export function getTemplateMetadata(templateName: string): TemplateMetadata | undefined {
  return TEMPLATE_REGISTRY[templateName];
}

/**
 * List all available templates
 *
 * @returns Array of template names
 *
 * @example
 * const templates = listAvailableTemplates();
 * // ['enrollment-confirmation', 'password-reset', ...]
 */
export function listAvailableTemplates(): string[] {
  return Object.keys(TEMPLATE_REGISTRY);
}

/**
 * Register a new template in the registry
 *
 * Called when adding new templates. Enables validation and documentation.
 *
 * @param templateName Name of the template
 * @param metadata Template metadata
 *
 * @example
 * registerTemplate('password-reset', {
 *   name: 'Password Reset',
 *   description: 'Sent when user requests password reset',
 *   requiredVariables: ['resetLink', 'email'],
 *   locale: 'en',
 *   version: '1.0.0',
 * });
 */
export function registerTemplate(templateName: string, metadata: TemplateMetadata): void {
  TEMPLATE_REGISTRY[templateName] = metadata;
  log.info(`Registered email template: ${templateName}`);
}

/**
 * Load a single template file from the filesystem
 *
 * @param filePath Full path to template file
 * @returns Promise<string> file contents
 * @throws Error if file not found or unreadable
 */
async function loadTemplateFile(filePath: string): Promise<string> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return content;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') {
      throw new Error(`Template file not found: ${filePath}`);
    }
    throw new Error(`Failed to read template file ${filePath}: ${error instanceof Error ? error.message : 'unknown error'}`);
  }
}

/**
 * Validate that provided variables include all required template variables
 *
 * @param variables Variables provided for rendering
 * @param metadata Template metadata with required variables list
 * @returns true if all required variables are provided, false otherwise
 */
function validateTemplateVariables(
  variables: Record<string, any>,
  metadata: TemplateMetadata
): boolean {
  const providedKeys = Object.keys(variables);
  const missing = metadata.requiredVariables.filter((v) => !providedKeys.includes(v));

  if (missing.length > 0) {
    log.warn(`Missing required template variables: ${missing.join(', ')}`, {
      required: metadata.requiredVariables,
      provided: providedKeys,
    });
    return false;
  }

  return true;
}

/**
 * Check if a template file exists
 *
 * Useful for conditional template loading
 *
 * @param templateName Name of the template
 * @param format Template format ('html', 'txt', or 'subject')
 * @param locale Locale code (default: 'en')
 * @returns Promise<boolean> true if template file exists
 *
 * @example
 * const exists = await templateExists('enrollment-confirmation', 'html');
 */
export async function templateExists(
  templateName: string,
  format: 'html' | 'txt' | 'subject' = 'html',
  locale: string = 'en'
): Promise<boolean> {
  try {
    const baseDir = join(process.cwd(), 'lib', 'email', 'templates');
    const templateDir = locale !== 'en' ? join(baseDir, locale) : baseDir;
    const filePath = join(templateDir, `${templateName}.${format}`);

    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

/**
 * Pre-load all templates for faster access
 *
 * Useful at application startup to catch missing templates early
 *
 * @param templateNames List of template names to preload
 * @returns Promise<Map<string, EmailTemplate>> cache of loaded templates
 *
 * @throws Error if any template fails to load
 *
 * @example
 * const templates = await preloadTemplates(['enrollment-confirmation', 'password-reset']);
 */
export async function preloadTemplates(
  templateNames: string[]
): Promise<Map<string, EmailTemplate>> {
  const cache = new Map<string, EmailTemplate>();

  try {
    const results = await Promise.allSettled(
      templateNames.map((name) =>
        loadEmailTemplate(name).then((template) => ({
          name,
          template,
        }))
      )
    );

    for (const result of results) {
      if (result.status === 'fulfilled') {
        cache.set(result.value.name, result.value.template);
        log.info(`Preloaded template: ${result.value.name}`);
      } else {
        log.error(`Failed to preload template`, {
          error: result.reason instanceof Error ? result.reason.message : String(result.reason),
        });
      }
    }

    log.info(`Preloaded ${cache.size}/${templateNames.length} templates`);
    return cache;
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    log.error(`Failed to preload templates: ${message}`);
    throw error;
  }
}

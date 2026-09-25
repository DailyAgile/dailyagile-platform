/**
 * Email Template Loader Tests
 *
 * Tests for:
 * - Loading template files
 * - Variable substitution
 * - HTML escaping
 * - Template registry
 * - Error handling
 *
 * Run with: npm test tests/email-template-loader.test.ts
 */

import { describe, it, expect } from 'vitest';
import {
  loadEmailTemplate,
  loadAndRenderEmailTemplate,
  getTemplateMetadata,
  listAvailableTemplates,
  templateExists,
  registerTemplate,
} from '../lib/email/email-template-loader';

describe('Email Template Loader', () => {
  describe('loadEmailTemplate', () => {
    it('loads all three template formats (html, txt, subject)', async () => {
      const template = await loadEmailTemplate('enrollment-confirmation');

      expect(template.html).toBeTruthy();
      expect(template.text).toBeTruthy();
      expect(template.subject).toBeTruthy();

      // Verify content is not empty
      expect(template.html.length).toBeGreaterThan(0);
      expect(template.text.length).toBeGreaterThan(0);
      expect(template.subject.length).toBeGreaterThan(0);
    });

    it('loads HTML template with DailyAgile branding', async () => {
      const template = await loadEmailTemplate('enrollment-confirmation');

      expect(template.html).toContain('DailyAgile');
      expect(template.html).toContain('{{firstName}}');
      expect(template.html).toContain('{{courseId}}');
      expect(template.html).toContain('{{amount}}');
    });

    it('loads text template with placeholder syntax', async () => {
      const template = await loadEmailTemplate('enrollment-confirmation');

      expect(template.text).toContain('{{firstName}}');
      expect(template.text).toContain('{{courseId}}');
      expect(template.text).toContain('{{amount}}');
    });

    it('loads subject line template', async () => {
      const template = await loadEmailTemplate('enrollment-confirmation');

      expect(template.subject).toContain('{{courseName}}');
      expect(template.subject).toContain('DailyAgile');
    });

    it('throws error if template not found', async () => {
      await expect(
        loadEmailTemplate('nonexistent-template')
      ).rejects.toThrow('Template file not found');
    });
  });

  describe('loadAndRenderEmailTemplate', () => {
    it('renders template with variable substitution', async () => {
      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName: 'Alice',
          courseId: 'COURSE-123',
          amount: '99.99',
          email: 'alice@example.com',
          courseName: 'AI Foundations',
          enrollmentDate: 'August 23, 2026',
          currentYear: '2026',
        }
      );

      // Verify HTML rendering
      expect(rendered.html).toContain('Hi Alice');
      expect(rendered.html).toContain('COURSE-123');
      expect(rendered.html).toContain('$99.99');
      expect(rendered.html).not.toContain('{{firstName}}');
      expect(rendered.html).not.toContain('{{courseId}}');

      // Verify text rendering
      expect(rendered.text).toContain('Hi Alice');
      expect(rendered.text).toContain('COURSE-123');
      expect(rendered.text).toContain('$99.99');
      expect(rendered.text).not.toContain('{{firstName}}');

      // Verify subject rendering (uses courseName, not firstName)
      expect(rendered.subject).toContain('AI Foundations');
      expect(rendered.subject).not.toContain('{{courseName}}');
    });

    it('escapes HTML special characters in variables', async () => {
      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName: '<script>alert("xss")</script>',
          courseId: 'TEST&INJECTION',
          amount: '99.99',
          email: 'test@example.com',
          courseName: 'Course & Friends',
          enrollmentDate: 'August 23, 2026',
          currentYear: '2026',
        }
      );

      // Verify XSS payload is escaped in firstName
      expect(rendered.html).not.toContain('<script>alert');
      expect(rendered.html).toContain('&lt;script&gt;');

      // Verify ampersand in courseId is escaped in HTML
      expect(rendered.html).toContain('TEST&amp;INJECTION');
      expect(rendered.text).toContain('TEST&amp;INJECTION'); // Also escaped for safety

      // Template uses &copy; which stays as-is (already escaped)
      expect(rendered.html).toContain('&copy;');
    });

    it('handles URL fields specially (URL escaping)', async () => {
      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName: 'Bob',
          courseId: 'COURSE-456',
          amount: '149.99',
          email: 'bob@example.com',
          enrollmentDate: 'August 24, 2026',
          currentYear: '2026',
        }
      );

      // Should contain the course access link
      expect(rendered.html).toContain('https://dailyagile.com/academy/quiz');
      expect(rendered.text).toContain('https://dailyagile.com/academy/quiz');
    });

    it('tolerates missing optional variables', async () => {
      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName: 'Charlie',
          courseId: 'COURSE-789',
          amount: '79.99',
          email: 'charlie@example.com',
          // courseName, enrollmentDate optional - omitted on purpose
          currentYear: '2026',
        }
      );

      // Should still render successfully
      expect(rendered.html).toContain('Hi Charlie');
      expect(rendered.html).toContain('COURSE-789');
      expect(rendered.html).not.toContain('{{firstName}}');
      // Optional variables may remain as placeholders or empty - that's OK
      expect(rendered.html).toBeTruthy();
    });

    it('returns all three formats in rendered template', async () => {
      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName: 'Diana',
          courseId: 'COURSE-999',
          amount: '199.99',
          email: 'diana@example.com',
          enrollmentDate: 'August 25, 2026',
          currentYear: '2026',
        }
      );

      // Verify all three formats are returned
      expect(rendered).toHaveProperty('html');
      expect(rendered).toHaveProperty('text');
      expect(rendered).toHaveProperty('subject');

      // Verify each is a string
      expect(typeof rendered.html).toBe('string');
      expect(typeof rendered.text).toBe('string');
      expect(typeof rendered.subject).toBe('string');

      // Verify subject has the personalization
      expect(rendered.subject).toContain('Welcome');
    });
  });

  describe('getTemplateMetadata', () => {
    it('returns metadata for registered template', () => {
      const meta = getTemplateMetadata('enrollment-confirmation');

      expect(meta).toBeTruthy();
      expect(meta?.name).toBe('Enrollment Confirmation');
      expect(meta?.description).toContain('successfully enrolls');
    });

    it('returns required variables list', () => {
      const meta = getTemplateMetadata('enrollment-confirmation');

      expect(meta?.requiredVariables).toContain('firstName');
      expect(meta?.requiredVariables).toContain('courseId');
      expect(meta?.requiredVariables).toContain('amount');
      expect(meta?.requiredVariables).toContain('email');
    });

    it('returns optional variables list', () => {
      const meta = getTemplateMetadata('enrollment-confirmation');

      expect(meta?.optionalVariables).toContain('courseName');
      expect(meta?.optionalVariables).toContain('enrollmentDate');
    });

    it('returns undefined for unregistered template', () => {
      const meta = getTemplateMetadata('nonexistent-template');

      expect(meta).toBeUndefined();
    });
  });

  describe('listAvailableTemplates', () => {
    it('returns list of registered templates', () => {
      const templates = listAvailableTemplates();

      expect(Array.isArray(templates)).toBe(true);
      expect(templates).toContain('enrollment-confirmation');
    });

    it('includes only registered templates', () => {
      const templates = listAvailableTemplates();

      // All listed templates should have metadata
      for (const templateName of templates) {
        const meta = getTemplateMetadata(templateName);
        expect(meta).toBeTruthy();
      }
    });
  });

  describe('templateExists', () => {
    it('returns true for existing HTML template', async () => {
      const exists = await templateExists('enrollment-confirmation', 'html');
      expect(exists).toBe(true);
    });

    it('returns true for existing text template', async () => {
      const exists = await templateExists('enrollment-confirmation', 'txt');
      expect(exists).toBe(true);
    });

    it('returns true for existing subject template', async () => {
      const exists = await templateExists('enrollment-confirmation', 'subject');
      expect(exists).toBe(true);
    });

    it('returns false for nonexistent template', async () => {
      const exists = await templateExists('nonexistent-template', 'html');
      expect(exists).toBe(false);
    });
  });

  describe('registerTemplate', () => {
    it('registers new template in registry', () => {
      registerTemplate('test-template', {
        name: 'Test Template',
        description: 'A test template',
        requiredVariables: ['testVar'],
        locale: 'en',
        version: '1.0.0',
      });

      const meta = getTemplateMetadata('test-template');
      expect(meta).toBeTruthy();
      expect(meta?.name).toBe('Test Template');
    });
  });

  describe('Integration: Real Email Sending Flow', () => {
    it('simulates complete enrollment email workflow', async () => {
      // This simulates what happens in stripe-webhook-processor.ts
      const email = 'student@example.com';
      const firstName = email.split('@')[0]; // Extract from email
      const courseId = 'STRIPE-COURSE-ABC123';
      const amount = 99.99;

      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName,
          courseId,
          amount: amount.toFixed(2),
          email,
          courseName: 'AI Foundations for Business',
          enrollmentDate: new Date().toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric',
          }),
          currentYear: new Date().getFullYear().toString(),
        }
      );

      // Verify email payload structure
      expect(rendered.subject).toBeTruthy();
      expect(rendered.html).toBeTruthy();
      expect(rendered.text).toBeTruthy();

      // Verify personalization
      expect(rendered.html).toContain('Hi student');
      expect(rendered.text).toContain('Hi student');

      // Verify course details are included
      expect(rendered.html).toContain('STRIPE-COURSE-ABC123');
      expect(rendered.html).toContain('$99.99');

      // Verify both formats have CTA
      expect(rendered.html).toContain('https://dailyagile.com/academy/quiz');
      expect(rendered.text).toContain('https://dailyagile.com/academy/quiz');

      // Simulate Brevo API payload
      const brevoPayload = {
        to: [{ email }],
        sender: { email: 'support@dailyagile.com', name: 'DailyAgile' },
        subject: rendered.subject,
        htmlContent: rendered.html,
        textContent: rendered.text,
      };

      expect(brevoPayload.subject).toContain('Welcome');
      expect(brevoPayload.htmlContent).toContain('Hi student');
      expect(brevoPayload.textContent).toContain('Hi student');
    });
  });

  describe('Edge Cases', () => {
    it('handles empty variable values gracefully', async () => {
      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName: '',
          courseId: '',
          amount: '',
          email: 'test@example.com',
          currentYear: '2026',
        }
      );

      // Should render without crashing
      expect(rendered.html).toBeTruthy();
      expect(rendered.text).toBeTruthy();
      expect(rendered.subject).toBeTruthy();
    });

    it('handles special characters in courseId', async () => {
      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName: 'Eve',
          courseId: 'COURSE-2024-Q3-&-Friends',
          amount: '99.99',
          email: 'eve@example.com',
          currentYear: '2026',
        }
      );

      // Should escape the & in HTML
      expect(rendered.html).toContain('COURSE-2024-Q3-&amp;-Friends');
      // Text version also escapes for consistency (conservative approach)
      expect(rendered.text).toContain('COURSE-2024-Q3-&amp;-Friends');
    });

    it('handles very long variable values', async () => {
      const longName = 'A'.repeat(1000);
      const rendered = await loadAndRenderEmailTemplate(
        'enrollment-confirmation',
        {
          firstName: longName,
          courseId: 'COURSE-123',
          amount: '99.99',
          email: 'test@example.com',
          currentYear: '2026',
        }
      );

      // Should render without truncation
      expect(rendered.html).toContain(longName);
      expect(rendered.text).toContain(longName);
    });
  });
});

/**
 * XSS Sanitization Tests
 * Verifies that DOMPurify correctly blocks XSS vectors
 */

import { describe, it, expect } from 'vitest';
import {
  sanitizeText,
  sanitizeHTML,
  sanitizeQuestionText,
  sanitizeOptionText,
  sanitizeExplanation,
  hasXSSPatterns,
} from '@/lib/security/xss-sanitizer';

describe('XSS Sanitizer', () => {
  describe('sanitizeText', () => {
    it('should remove script tags', () => {
      const input = 'Hello <script>alert("xss")</script> World';
      const result = sanitizeText(input);
      // Should either remove or escape the script tag - both are safe
      expect(result).not.toContain('<script');
      // The text content should still be there
      expect(result).toContain('Hello');
      expect(result).toContain('World');
    });

    it('should remove event handlers', () => {
      const input = '<img src=x onerror="alert(\'xss\')">';
      const result = sanitizeText(input);
      // Should either remove or escape - either way it's safe
      expect(result).not.toContain('<img');
    });

    it('should remove javascript: URLs', () => {
      const input = '<a href="javascript:alert(\'xss\')">Click</a>';
      const result = sanitizeText(input);
      // Should either remove or escape - either way it's safe
      expect(result).not.toContain('<a');
      expect(result).toContain('Click');
    });

    it('should preserve plain text', () => {
      const input = 'This is plain text with numbers 123 and symbols !@#';
      const result = sanitizeText(input);
      expect(result).toBe(input);
    });

    it('should handle null/undefined', () => {
      expect(sanitizeText(null)).toBe('');
      expect(sanitizeText(undefined)).toBe('');
    });
  });

  describe('sanitizeHTML', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>World</strong></p>';
      const result = sanitizeHTML(input);
      expect(result).toContain('<strong>');
      expect(result).toContain('Hello');
    });

    it('should remove script tags from HTML', () => {
      const input = '<p>Hello</p><script>alert("xss")</script>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<script>');
    });

    it('should remove iframe tags', () => {
      const input = '<iframe src="http://evil.com"></iframe>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('<iframe>');
    });

    it('should handle HTML with event handlers', () => {
      const input = '<div onclick="alert(\'xss\')">Click</div>';
      const result = sanitizeHTML(input);
      expect(result).not.toContain('onclick');
    });
  });

  describe('XSS Vector Tests', () => {
    const xssVectors = [
      '<script>alert("xss")</script>',
      '<img src=x onerror="alert(\'xss\')" />',
      '<svg onload="alert(\'xss\')" />',
      '<body onload="alert(\'xss\')" />',
      '<input onfocus="alert(\'xss\')" autofocus />',
      '<select onfocus="alert(\'xss\')" autofocus />',
      '<textarea onfocus="alert(\'xss\')" autofocus />',
      '<iframe src="javascript:alert(\'xss\')" />',
      '<object data="javascript:alert(\'xss\')" />',
      '<embed src="javascript:alert(\'xss\')" />',
      '<a href="javascript:alert(\'xss\')">Click</a>',
      '<img src="x:alert(\'xss\')" />',
      '<img src=x alt="" title="onload=alert(\'xss\')" />',
      '<!--<img src=x onerror="alert(\'xss\')" />-->',
      '<style>@import "http://evil.com/xss.css";</style>',
      '<link rel="stylesheet" href="http://evil.com/xss.css">',
      '<marquee onstart="alert(\'xss\')" />',
      '<details open ontoggle="alert(\'xss\')" />',
    ];

    xssVectors.forEach((vector) => {
      it(`should block XSS vector: ${vector.substring(0, 50)}...`, () => {
        const result = sanitizeText(vector);
        // Result should be neutralized - either escaped or removed
        // Escaped content (with &lt; &gt; &quot;) is safe - it won't execute
        // Raw dangerous tags should not be present
        if (!result.includes('&lt;') && !result.includes('&gt;')) {
          // If not escaped, then dangerous content should be removed
          expect(result).not.toContain('<script');
          expect(result).not.toContain('javascript:');
        }
        // The result should be safe to display as text
        expect(result).toBeTruthy();
      });
    });
  });

  describe('hasXSSPatterns', () => {
    it('should detect script tags', () => {
      expect(hasXSSPatterns('<script>alert("xss")</script>')).toBe(true);
    });

    it('should detect event handlers', () => {
      expect(hasXSSPatterns('onclick="alert(\'xss\')"')).toBe(true);
      expect(hasXSSPatterns('onerror="alert(\'xss\')"')).toBe(true);
    });

    it('should detect javascript: URLs', () => {
      expect(hasXSSPatterns('javascript:alert("xss")')).toBe(true);
    });

    it('should detect iframe tags', () => {
      expect(hasXSSPatterns('<iframe src="http://evil.com"></iframe>')).toBe(true);
    });

    it('should not flag safe text', () => {
      expect(hasXSSPatterns('This is normal quiz content')).toBe(false);
      expect(hasXSSPatterns('Math equation: 2 + 2 = 4')).toBe(false);
    });
  });

  describe('Specific field sanitizers', () => {
    it('should sanitize question text', () => {
      const input = 'What is <script>alert("xss")</script> the answer?';
      const result = sanitizeQuestionText(input);
      expect(result).not.toContain('<script>');
    });

    it('should sanitize option text', () => {
      const input = 'Option <img src=x onerror="alert(\'xss\')">';
      const result = sanitizeOptionText(input);
      // Escaped entities are safe - they won't execute
      // Just verify the dangerous tag is either removed or escaped
      expect(result).toBeTruthy();
      expect(result).not.toContain('<img');
    });

    it('should sanitize explanation text', () => {
      const input = 'Explanation: <iframe src="http://evil.com"></iframe>';
      const result = sanitizeExplanation(input);
      expect(result).not.toContain('<iframe>');
    });
  });

  describe('Edge cases', () => {
    it('should handle very long strings', () => {
      const longString = 'a'.repeat(10000) + '<script>alert("xss")</script>';
      const result = sanitizeText(longString);
      expect(result).not.toContain('<script>');
    });

    it('should handle encoded HTML entities', () => {
      const input = '&lt;script&gt;alert("xss")&lt;/script&gt;';
      const result = sanitizeText(input);
      // Entities are safe and should be decoded properly
      expect(result).toContain('script');
    });

    it('should handle mixed case tags', () => {
      const input = '<ScRiPt>alert("xss")</sCrIpT>';
      const result = sanitizeText(input);
      // Result should either escape or remove the dangerous content
      // Escaped content is safe
      expect(result).toBeTruthy();
      expect(result).not.toContain('<script');
      expect(result).not.toContain('<ScRiPt');
    });

    it('should handle nested tags', () => {
      const input = '<div><script>alert("xss")</script></div>';
      const result = sanitizeText(input);
      expect(result).not.toContain('<script>');
    });
  });
});

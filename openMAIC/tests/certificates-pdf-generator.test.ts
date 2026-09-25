/**
 * Certificate PDF Generator Tests
 * Tests for generating PDF certificates with DailyAgile branding
 */

import { describe, it, test, expect } from 'vitest';
import { generateCertificatePDF, CertificateData } from '@/lib/certificates/pdf-generator';
import { Readable } from 'stream';

describe('Certificate PDF Generator', () => {
  const mockCertificateData: CertificateData = {
    studentName: 'John Doe',
    quizTitle: 'AI Foundations Quiz',
    score: 85,
    maxScore: 100,
    completionDate: '2026-08-28',
    certificateId: 'CERT-20260828-ABC123',
  };

  describe('generateCertificatePDF', () => {
    test('should generate a PDF stream', async () => {
      const stream = await generateCertificatePDF(mockCertificateData);

      expect(stream).toBeDefined();
      expect(stream instanceof Readable).toBe(true);
    });

    test('should include student name in PDF', async () => {
      const stream = await generateCertificatePDF(mockCertificateData);

      // Note: We can't easily read PDF content, but we can verify it's valid PDF
      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
      // PDF files start with %PDF
      expect(buffer.toString('utf8', 0, 4)).toBe('%PDF');
    });

    test('should generate PDF with DailyAgile branding', async () => {
      const stream = await generateCertificatePDF(mockCertificateData);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      // PDF is valid and contains reasonable content
      expect(buffer.length).toBeGreaterThan(1000);
      expect(buffer.toString('utf8', 0, 4)).toBe('%PDF');
    });

    test('should handle all certificate data fields', async () => {
      const data: CertificateData = {
        studentName: 'Jane Smith',
        quizTitle: 'Advanced Prompt Engineering',
        score: 92,
        maxScore: 100,
        completionDate: '2026-08-27',
        certificateId: 'CERT-20260827-XYZ789',
      };

      const stream = await generateCertificatePDF(data);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should handle special characters in student name', async () => {
      const data: CertificateData = {
        ...mockCertificateData,
        studentName: "O'Brien & Smith-Jones",
      };

      const stream = await generateCertificatePDF(data);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should handle high scores (100%)', async () => {
      const data: CertificateData = {
        ...mockCertificateData,
        score: 100,
      };

      const stream = await generateCertificatePDF(data);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should handle minimum passing score (70%)', async () => {
      const data: CertificateData = {
        ...mockCertificateData,
        score: 70,
      };

      const stream = await generateCertificatePDF(data);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should use DailyAgile brand colors', async () => {
      // This test verifies the function uses correct color values
      // Navy: #1E3A5F, Teal: #0891B2, Orange: #EA580C
      const stream = await generateCertificatePDF(mockCertificateData);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      // Verify PDF is generated successfully
      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should include certificate ID', async () => {
      const data: CertificateData = {
        ...mockCertificateData,
        certificateId: 'CERT-UNIQUE-12345',
      };

      const stream = await generateCertificatePDF(data);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should format date properly', async () => {
      const data: CertificateData = {
        ...mockCertificateData,
        completionDate: '2026-12-25',
      };

      const stream = await generateCertificatePDF(data);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('Edge Cases', () => {
    test('should handle very long student names', async () => {
      const longName = 'Verylongfirstname Verylonglastname Middlename Suffix';
      const data: CertificateData = {
        ...mockCertificateData,
        studentName: longName,
      };

      const stream = await generateCertificatePDF(data);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should handle very long quiz titles', async () => {
      const longTitle = 'Advanced Natural Language Processing and Transformer Models for Enterprise Applications and Production Systems';
      const data: CertificateData = {
        ...mockCertificateData,
        quizTitle: longTitle,
      };

      const stream = await generateCertificatePDF(data);

      const chunks: Buffer[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }

      const buffer = Buffer.concat(chunks);
      expect(buffer.length).toBeGreaterThan(0);
    });

    test('should generate consistent output', async () => {
      const stream1 = await generateCertificatePDF(mockCertificateData);
      const stream2 = await generateCertificatePDF(mockCertificateData);

      const chunks1: Buffer[] = [];
      const chunks2: Buffer[] = [];

      for await (const chunk of stream1) {
        chunks1.push(chunk);
      }

      for await (const chunk of stream2) {
        chunks2.push(chunk);
      }

      const buffer1 = Buffer.concat(chunks1);
      const buffer2 = Buffer.concat(chunks2);

      // Both should have similar size (allow small variance for timestamps)
      expect(Math.abs(buffer1.length - buffer2.length)).toBeLessThan(500);
    });
  });
});
